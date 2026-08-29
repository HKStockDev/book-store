import {
  getAdminClient,
  getAnonClient,
  getUserFromToken,
  toAuthUser,
  type AuthUser,
} from "./supabase-server";
import { getAppUrl, getStripe, SUBSCRIPTION_PLANS, type SubscriptionPlan } from "./stripe";
import { getOrCreateStripeCustomer } from "./stripe-webhook";
import { SUBSCRIPTION_PLANS as SUBSCRIPTION_PLANS_UI } from "./subscription-plans";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function error(message: string, status = 400) {
  return Response.json({ message, statusCode: status }, { status });
}

export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function getToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function requireAuth(req: Request, roles?: AuthUser["role"][]) {
  const token = getToken(req);
  if (!token) return { err: error("Missing or invalid authorization header", 401) };
  const user = await getUserFromToken(token);
  if (!user) return { err: error("Invalid or expired token", 401) };
  if (roles && !roles.includes(user.role)) return { err: error("Insufficient permissions", 403) };
  return { user };
}

const INTEREST_CATEGORIES = [
  "Ficción", "No ficción", "Cómics", "Podcasts", "Noticias",
  "Documentos", "Historia", "Ciencia", "Arte", "Infantil",
];

function buildActivityHistory(
  library: { last_read_at: string | null }[],
  reviews: { created_at: string }[],
  purchases: { created_at: string }[],
  monthCount = 6,
) {
  const now = new Date();
  const months: string[] = [];
  const reading: number[] = [];
  const reviewCounts: number[] = [];
  const purchaseCounts: number[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = monthStart.toLocaleDateString("es-ES", { month: "short" });
    months.push(label.charAt(0).toUpperCase() + label.slice(1));

    const inMonth = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= monthStart && date <= monthEnd;
    };

    reading.push(library.filter((item) => item.last_read_at && inMonth(item.last_read_at)).length);
    reviewCounts.push(reviews.filter((item) => inMonth(item.created_at)).length);
    purchaseCounts.push(purchases.filter((item) => inMonth(item.created_at)).length);
  }

  return { months, reading, reviews: reviewCounts, purchases: purchaseCounts };
}

export async function handleApiRequest(req: Request, pathSegments: string[]) {
  const method = req.method;
  const path = pathSegments.join("/");
  const db = getAdminClient();

  try {
    // AUTH
    if (path === "auth/login" && method === "POST") {
      const body = await parseBody<{ email: string; password: string }>(req);
      const { data, error: authError } = await getAnonClient().auth.signInWithPassword(body);
      if (authError || !data.session) return error("Invalid email or password", 401);
      const { data: profile } = await db.from("profiles").select("*").eq("id", data.user.id).single();
      if (!profile) return error("Profile not found", 401);
      if (profile.status === "suspended") return error("Account suspended", 401);
      return json({
        user: toAuthUser(profile, data.session.access_token),
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      });
    }

    if (path === "auth/signup" && method === "POST") {
      const body = await parseBody<{ email: string; password: string; fullName: string; role?: string; editorialName?: string }>(req);
      const role = body.role ?? "user";
      const { data: authData, error: authError } = await db.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.fullName, role },
      });
      if (authError) return error(authError.message.includes("already") ? "Email already registered" : authError.message, 400);

      let editorialId: string | null = null;
      if (role === "publisher" && body.editorialName) {
        const { data: editorial } = await db.from("editorials").insert({
          name: body.editorialName.trim(),
          contact_email: body.email,
          owner_id: authData.user.id,
          status: "pending",
        }).select().single();
        editorialId = editorial?.id ?? null;
      }

      await db.from("profiles").update({
        full_name: body.fullName,
        role,
        editorial_id: editorialId,
      }).eq("id", authData.user.id);

      const loginReq = new Request(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: body.email, password: body.password }),
      });
      return handleApiRequest(loginReq, ["auth", "login"]);
    }

    if (path === "auth/me" && method === "GET") {
      const auth = await requireAuth(req);
      if (auth.err) return auth.err;
      const { data: profile } = await db.from("profiles").select("*").eq("id", auth.user!.id).single();
      if (!profile) return error("Profile not found", 401);
      let editorial = null;
      if (profile.editorial_id) {
        const { data } = await db.from("editorials").select("id, name, status, cpm_rate").eq("id", profile.editorial_id).single();
        editorial = data;
      }
      return json({ user: toAuthUser(profile, auth.user!.accessToken), editorial });
    }

    if (path === "auth/logout" && method === "POST") {
      const token = getToken(req);
      if (token) {
        const { data } = await db.auth.getUser(token);
        if (data.user) await db.auth.admin.signOut(data.user.id);
      }
      return json({ success: true });
    }

    // CATALOG (public)
    if (path === "catalog/categories" && method === "GET") {
      const { data, error: qErr } = await db
        .from("content_items")
        .select("genre")
        .eq("status", "published")
        .not("genre", "is", null);
      if (qErr) return error(qErr.message, 500);
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.genre) counts[row.genre] = (counts[row.genre] ?? 0) + 1;
      }
      const categories = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return json(categories);
    }

    if (path === "catalog" && method === "GET") {
      const url = new URL(req.url);
      let query = db.from("content_items").select("*, editorials(name)").eq("status", "published");
      const type = url.searchParams.get("type");
      const genre = url.searchParams.get("genre");
      const search = url.searchParams.get("search");
      if (type) query = query.eq("type", type);
      if (genre) query = query.eq("genre", genre);
      if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
      const { data, error: qErr } = await query.order("published_at", { ascending: false }).limit(500);
      if (qErr) return error(qErr.message, 500);
      return json(data);
    }

    if (path.match(/^catalog\/[^/]+$/) && method === "GET") {
      const id = pathSegments[1];
      const { data, error: qErr } = await db.from("content_items").select("*, editorials(name, id)").eq("id", id).eq("status", "published").single();
      if (qErr) return error(qErr.message, 404);
      const { data: reviews } = await db.from("reviews").select("*, profiles(full_name)").eq("content_id", id).order("created_at", { ascending: false });
      return json({ ...data, reviews: reviews ?? [] });
    }

    if (path.match(/^catalog\/[^/]+\/purchase$/) && method === "POST") {
      return error("Use Stripe checkout: POST /api/stripe/checkout/purchase", 400);
    }

    // STRIPE CHECKOUT
    if (path === "stripe/checkout/purchase" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ contentId: string }>(req);
      const { data: content } = await db.from("content_items").select("*").eq("id", body.contentId).eq("status", "published").single();
      if (!content || content.price == null) return error("Content not found or not for sale", 404);

      const stripe = getStripe();
      const customerId = await getOrCreateStripeCustomer(db, auth.user!.id, auth.user!.email, stripe);

      const { data: payment } = await db.from("payments").insert({
        user_id: auth.user!.id,
        type: "purchase",
        description: content.title,
        amount: content.price,
        status: "pending",
        content_id: body.contentId,
      }).select().single();

      const baseUrl = getAppUrl();
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            unit_amount: Math.round(Number(content.price) * 100),
            product_data: { name: content.title, description: content.description ?? undefined },
          },
          quantity: 1,
        }],
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/content/${body.contentId}?canceled=1`,
        metadata: {
          type: "purchase",
          userId: auth.user!.id,
          contentId: body.contentId,
          paymentId: payment!.id,
        },
      });

      await db.from("payments").update({ stripe_checkout_session_id: session.id }).eq("id", payment!.id);
      return json({ url: session.url, sessionId: session.id });
    }

    if (path === "stripe/checkout/subscription" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ plan: SubscriptionPlan }>(req);
      const planInfo = SUBSCRIPTION_PLANS[body.plan];
      if (!planInfo) return error("Invalid plan");

      const stripe = getStripe();
      const customerId = await getOrCreateStripeCustomer(db, auth.user!.id, auth.user!.email, stripe);

      const { data: payment } = await db.from("payments").insert({
        user_id: auth.user!.id,
        type: "subscription",
        description: `Suscripción ${planInfo.name} - Mensual`,
        amount: planInfo.price,
        status: "pending",
      }).select().single();

      const baseUrl = getAppUrl();
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            unit_amount: Math.round(planInfo.price * 100),
            recurring: { interval: "month" },
            product_data: { name: planInfo.name },
          },
          quantity: 1,
        }],
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription?canceled=1`,
        metadata: {
          type: "subscription",
          userId: auth.user!.id,
          plan: body.plan,
          paymentId: payment!.id,
        },
      });

      await db.from("payments").update({ stripe_checkout_session_id: session.id }).eq("id", payment!.id);
      return json({ url: session.url, sessionId: session.id });
    }

    if (path.match(/^stripe\/session\/[^/]+$/) && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const sessionId = pathSegments[2];
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.userId !== auth.user!.id) return error("Forbidden", 403);
      return json({
        status: session.status,
        paymentStatus: session.payment_status,
        type: session.metadata?.type,
      });
    }

    // ONBOARDING
    if (path === "onboarding/categories" && method === "GET") return json(INTEREST_CATEGORIES);

    if (path === "onboarding/interests" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("user_interests").select("category").eq("user_id", auth.user!.id);
      return json((data ?? []).map((i) => i.category));
    }

    if (path === "onboarding/interests" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ categories: string[] }>(req);
      await db.from("user_interests").delete().eq("user_id", auth.user!.id);
      if (body.categories?.length) {
        await db.from("user_interests").insert(body.categories.map((c) => ({ user_id: auth.user!.id, category: c })));
      }
      await db.from("profiles").update({ onboarding_completed: true }).eq("id", auth.user!.id);
      return json({ success: true, categories: body.categories });
    }

    // SUBSCRIPTIONS
    if (path === "subscriptions/plans" && method === "GET") return json(SUBSCRIPTION_PLANS_UI);

    if (path === "subscriptions/me" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("subscriptions").select("*").eq("user_id", auth.user!.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return json(data);
    }

    if (path === "subscriptions/subscribe" && method === "POST") {
      return error("Use Stripe checkout: POST /api/stripe/checkout/subscription", 400);
    }

    // PROFILE
    if (path === "profile" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const userId = auth.user!.id;

      const [
        { data: profile },
        { data: interests },
        { data: subscription },
        { count: libraryCount },
        { count: listsCount },
        { count: reviewsCount },
        { count: purchasesCount },
        { data: recentPayments },
        { data: libraryActivity },
        { data: reviewActivity },
        { data: purchaseActivity },
      ] = await Promise.all([
        db.from("profiles").select("*").eq("id", userId).single(),
        db.from("user_interests").select("category").eq("user_id", userId),
        db.from("subscriptions").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("user_library").select("id", { count: "exact", head: true }).eq("user_id", userId),
        db.from("user_lists").select("id", { count: "exact", head: true }).eq("user_id", userId),
        db.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
        db.from("payments").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
        db.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        db.from("user_library").select("last_read_at").eq("user_id", userId).not("last_read_at", "is", null),
        db.from("reviews").select("created_at").eq("user_id", userId),
        db.from("payments").select("created_at").eq("user_id", userId).eq("type", "purchase").eq("status", "completed"),
      ]);

      if (!profile) return error("Profile not found", 404);

      const activityHistory = buildActivityHistory(
        libraryActivity ?? [],
        reviewActivity ?? [],
        purchaseActivity ?? [],
      );

      return json({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
        status: profile.status,
        onboarding_completed: profile.onboarding_completed,
        created_at: profile.created_at,
        interests: (interests ?? []).map((i) => i.category),
        subscription: subscription ?? null,
        stats: {
          libraryCount: libraryCount ?? 0,
          listsCount: listsCount ?? 0,
          reviewsCount: reviewsCount ?? 0,
          purchasesCount: purchasesCount ?? 0,
        },
        activityHistory,
        recentPayments: recentPayments ?? [],
      });
    }

    if (path === "profile" && method === "PATCH") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ fullName?: string; avatarUrl?: string }>(req);
      const updates: Record<string, string | null> = {};
      if (body.fullName !== undefined) updates.full_name = body.fullName.trim() || null;
      if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl.trim() || null;
      if (!Object.keys(updates).length) return error("No fields to update", 400);

      const { data, error: updateError } = await db
        .from("profiles")
        .update(updates)
        .eq("id", auth.user!.id)
        .select("*")
        .single();
      if (updateError) return error(updateError.message, 400);
      return json({
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
      });
    }

    // LIBRARY
    if (path === "library" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("user_library").select("*, content_items(*, editorials(name))").eq("user_id", auth.user!.id).order("last_read_at", { ascending: false, nullsFirst: false });
      return json(data ?? []);
    }

    // LISTS
    if (path === "lists" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("user_lists").select("*, list_items(content_id, content_items(title, type, cover_url, price, published_at, purchases))").eq("user_id", auth.user!.id).order("created_at", { ascending: false });
      return json(data ?? []);
    }

    if (path === "lists" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ name: string; isPublic?: boolean }>(req);
      const { data } = await db.from("user_lists").insert({
        user_id: auth.user!.id,
        name: body.name,
        is_public: body.isPublic ?? false,
      }).select().single();
      return json(data);
    }

    if (path.match(/^lists\/[^/]+\/items$/) && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const listId = pathSegments[1];
      const body = await parseBody<{ contentId: string }>(req);
      if (!body.contentId) return error("contentId required", 400);
      const { data: list } = await db.from("user_lists").select("id").eq("id", listId).eq("user_id", auth.user!.id).single();
      if (!list) return error("List not found", 404);
      const { data: content } = await db.from("content_items").select("id").eq("id", body.contentId).eq("status", "published").single();
      if (!content) return error("Content not found", 404);
      const { data, error: insErr } = await db
        .from("list_items")
        .upsert({ list_id: listId, content_id: body.contentId }, { onConflict: "list_id,content_id" })
        .select("*, content_items(title, type, cover_url)")
        .single();
      if (insErr) return error(insErr.message, 400);
      return json(data);
    }

    if (path.match(/^lists\/[^/]+\/items\/[^/]+$/) && method === "DELETE") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const listId = pathSegments[1];
      const contentId = pathSegments[3];
      const { data: list } = await db.from("user_lists").select("id").eq("id", listId).eq("user_id", auth.user!.id).single();
      if (!list) return error("List not found", 404);
      const { error: delErr } = await db.from("list_items").delete().eq("list_id", listId).eq("content_id", contentId);
      if (delErr) return error(delErr.message, 400);
      return json({ success: true });
    }

    if (path.match(/^lists\/[^/]+$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const listId = pathSegments[1];
      const body = await parseBody<{ name?: string; isPublic?: boolean }>(req);
      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name.trim();
      if (body.isPublic !== undefined) updates.is_public = body.isPublic;
      if (!Object.keys(updates).length) return error("No fields to update", 400);
      const { data, error: updErr } = await db
        .from("user_lists")
        .update(updates)
        .eq("id", listId)
        .eq("user_id", auth.user!.id)
        .select("*, list_items(content_id, content_items(title, type, cover_url, price, published_at, purchases))")
        .single();
      if (updErr) return error(updErr.message, 400);
      return json(data);
    }

    if (path.match(/^lists\/[^/]+$/) && method === "DELETE") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const listId = pathSegments[1];
      const { error: delErr } = await db.from("user_lists").delete().eq("id", listId).eq("user_id", auth.user!.id);
      if (delErr) return error(delErr.message, 400);
      return json({ success: true });
    }

    // REVIEWS
    if (path === "reviews" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ contentId: string; rating: number; comment?: string }>(req);
      const { data } = await db.from("reviews").upsert({
        user_id: auth.user!.id,
        content_id: body.contentId,
        rating: body.rating,
        comment: body.comment ?? null,
      }, { onConflict: "user_id,content_id" }).select("*, profiles(full_name)").single();
      return json(data);
    }

    // DASHBOARD
    if (path === "dashboard/stats" && method === "GET") {
      const auth = await requireAuth(req);
      if (auth.err) return auth.err;
      const user = auth.user!;

      if (user.role === "admin") {
        const [users, editorials, content, payments, promotions, settlements] = await Promise.all([
          db.from("profiles").select("id, status"),
          db.from("editorials").select("id, status, name, total_revenue"),
          db.from("content_items").select("impressions"),
          db.from("payments").select("amount, status, type, created_at"),
          db.from("promotions").select("id, status, name, editorial_id, impressions, clicks, editorials(name)").eq("status", "active"),
          db.from("cpm_settlements").select("id, editorial_id, period, amount, status, editorials(name)"),
        ]);
        const completed = (payments.data ?? []).filter((p) => p.status === "completed");
        return json({
          totalUsers: users.data?.length ?? 0,
          totalEditorials: editorials.data?.length ?? 0,
          totalContent: content.data?.length ?? 0,
          totalRevenue: completed.reduce((s, p) => s + Number(p.amount), 0),
          monthlyRevenue: completed.reduce((s, p) => s + Number(p.amount), 0),
          totalImpressions: (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0),
          pendingSettlements: (settlements.data ?? []).filter((s) => s.status === "pending").length,
          activePromotions: promotions.data?.length ?? 0,
        });
      }

      if (user.role === "publisher" && user.editorialId) {
        const [content, settlements] = await Promise.all([
          db.from("content_items").select("impressions, purchases").eq("editorial_id", user.editorialId),
          db.from("cpm_settlements").select("amount, status").eq("editorial_id", user.editorialId),
        ]);
        return json({
          editorialContent: content.data?.length ?? 0,
          editorialImpressions: (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0),
          editorialRevenue: (settlements.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
        });
      }

      const { data: payments } = await db.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
      return json({ recentPayments: payments ?? [] });
    }

    // USERS
    if (path === "users" && method === "GET") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("profiles").select("*").order("created_at", { ascending: false });
      return json(data ?? []);
    }

    if (path.match(/^users\/[^/]+\/suspend$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("profiles").update({ status: "suspended" }).eq("id", pathSegments[1]).select().single();
      return json(data);
    }

    if (path.match(/^users\/[^/]+\/activate$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("profiles").update({ status: "active" }).eq("id", pathSegments[1]).select().single();
      return json(data);
    }

    // EDITORIALS
    if (path === "editorials" && method === "GET") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      let query = db.from("editorials").select("*");
      if (auth.user!.role === "publisher" && auth.user!.editorialId) query = query.eq("id", auth.user!.editorialId);
      const { data } = await query.order("created_at", { ascending: false });
      return json(data ?? []);
    }

    if (path.match(/^editorials\/[^/]+\/approve$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("editorials").update({ status: "active" }).eq("id", pathSegments[1]).select().single();
      return json(data);
    }

    if (path.match(/^editorials\/[^/]+\/suspend$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("editorials").update({ status: "suspended" }).eq("id", pathSegments[1]).select().single();
      return json(data);
    }

    // CONTENT
    if (path === "content" && method === "GET") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      let query = db.from("content_items").select("*, editorials(name)");
      if (auth.user!.role === "publisher" && auth.user!.editorialId) query = query.eq("editorial_id", auth.user!.editorialId);
      const { data } = await query.order("created_at", { ascending: false });
      return json(data ?? []);
    }

    if (path === "content" && method === "POST") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      const body = await parseBody<Record<string, unknown>>(req);
      const editorialId = auth.user!.role === "publisher" ? auth.user!.editorialId : (body.editorialId as string);
      const { data } = await db.from("content_items").insert({
        title: body.title,
        type: body.type,
        editorial_id: editorialId,
        price: body.price ?? null,
        integration: body.integration ?? null,
        cover_url: body.cover_url ?? null,
        author: body.author ?? null,
        description: body.description ?? null,
        status: auth.user!.role === "publisher" ? "review" : "draft",
      }).select().single();
      return json(data);
    }

    if (path.match(/^content\/[^/]+$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      const body = await parseBody<Record<string, unknown>>(req);
      const updates: Record<string, unknown> = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.cover_url !== undefined) updates.cover_url = body.cover_url;
      if (body.author !== undefined) updates.author = body.author;
      if (body.description !== undefined) updates.description = body.description;
      if (body.price !== undefined) updates.price = body.price;
      if (body.integration !== undefined) updates.integration = body.integration;
      let query = db.from("content_items").update(updates).eq("id", pathSegments[1]);
      if (auth.user!.role === "publisher" && auth.user!.editorialId) {
        query = query.eq("editorial_id", auth.user!.editorialId);
      }
      const { data } = await query.select().single();
      return json(data);
    }

    if (path.match(/^content\/[^/]+\/status$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ status: string }>(req);
      const { data } = await db.from("content_items").update({
        status: body.status,
        published_at: body.status === "published" ? new Date().toISOString() : null,
      }).eq("id", pathSegments[1]).select().single();
      return json(data);
    }

    // PAYMENTS
    if (path === "payments" && method === "GET") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("payments").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
      return json(data ?? []);
    }

    // CPM
    if (path === "cpm/settlements" && method === "GET") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      let query = db.from("cpm_settlements").select("*, editorials(name)");
      if (auth.user!.role === "publisher" && auth.user!.editorialId) query = query.eq("editorial_id", auth.user!.editorialId);
      const { data } = await query.order("period", { ascending: false });
      return json(data ?? []);
    }

    if (path === "cpm/settlements/calculate" && method === "POST") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ period: string }>(req);
      const { data: editorials } = await db.from("editorials").select("id, cpm_rate").eq("status", "active");
      const results = [];
      for (const ed of editorials ?? []) {
        const { data: content } = await db.from("content_items").select("impressions").eq("editorial_id", ed.id);
        const impressions = (content ?? []).reduce((s, c) => s + Number(c.impressions), 0);
        const amount = (impressions / 1000) * Number(ed.cpm_rate);
        const { data } = await db.from("cpm_settlements").upsert({
          editorial_id: ed.id, period: body.period, impressions, cpm_rate: ed.cpm_rate, amount, status: "pending",
        }, { onConflict: "editorial_id,period" }).select().single();
        if (data) results.push(data);
      }
      return json(results);
    }

    if (path.match(/^cpm\/settlements\/[^/]+\/approve$/) && method === "PATCH") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("cpm_settlements").update({ status: "paid" }).eq("id", pathSegments[2]).select().single();
      return json(data);
    }

    // PROMOTIONS
    if (path === "promotions" && method === "GET") {
      const auth = await requireAuth(req, ["admin", "publisher"]);
      if (auth.err) return auth.err;
      let query = db.from("promotions").select("*, editorials(name)");
      if (auth.user!.role === "publisher" && auth.user!.editorialId) query = query.eq("editorial_id", auth.user!.editorialId);
      const { data } = await query.order("created_at", { ascending: false });
      return json(data ?? []);
    }

    // REPORTS
    if (path === "reports/summary" && method === "GET") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      const [users, content, payments] = await Promise.all([
        db.from("profiles").select("id, status"),
        db.from("content_items").select("type, impressions"),
        db.from("payments").select("amount, status"),
      ]);
      const completed = (payments.data ?? []).filter((p) => p.status === "completed");
      const contentByType = (content.data ?? []).reduce<Record<string, number>>((acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
      }, {});
      return json({
        activeUsers: users.data?.filter((u) => u.status === "active").length ?? 0,
        totalRevenue: completed.reduce((s, p) => s + Number(p.amount), 0),
        publishedContent: content.data?.length ?? 0,
        totalImpressions: (content.data ?? []).reduce((s, c) => s + Number(c.impressions), 0),
        contentByType,
      });
    }

    // SETTINGS
    if (path === "settings/platform" && method === "GET") {
      const auth = await requireAuth(req, ["admin"]);
      if (auth.err) return auth.err;
      return json({
        cpmDefaultRate: Number(process.env.CPM_DEFAULT_RATE ?? 2.5),
        subscriptionPlans: [
          { id: "basic", name: "Básico", price: 4.99 },
          { id: "premium", name: "Premium", price: 9.99 },
          { id: "family", name: "Familiar", price: 14.99 },
        ],
        integrations: {
          apryse: { enabled: Boolean(process.env.APRYSE_API_KEY) },
          taddy: { enabled: Boolean(process.env.TADDY_API_KEY) },
          worldNews: { enabled: Boolean(process.env.WORLDNEWS_API_KEY) },
        },
      });
    }

    return error(`Cannot ${method} /api/${path}`, 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    if (msg.includes("Missing environment variable")) return error(msg, 500);
    return error(msg, 500);
  }
}
