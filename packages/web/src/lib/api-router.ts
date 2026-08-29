import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export function getAnonClient() {
  if (!anonClient) {
    anonClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"));
  }
  return anonClient;
}

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "publisher" | "user";
  fullName: string | null;
  editorialId: string | null;
  accessToken: string;
};

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  const { data, error } = await getAnonClient().auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name,
    editorialId: profile.editorial_id,
    accessToken: token,
  };
}

export function toAuthUser(profile: Record<string, unknown>, accessToken: string): AuthUser {
  return {
    id: profile.id as string,
    email: profile.email as string,
    role: profile.role as AuthUser["role"],
    fullName: profile.full_name as string | null,
    editorialId: profile.editorial_id as string | null,
    accessToken,
  };
}

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

const SUBSCRIPTION_PLANS = {
  basic: { name: "Básica", price: 4.99, features: ["Acceso a noticias", "5 descargas offline/mes"] },
  premium: { name: "Premium", price: 9.99, features: ["Todo el catálogo", "Descargas ilimitadas", "Sin anuncios"] },
  family: { name: "Familiar", price: 14.99, features: ["Hasta 5 perfiles", "Todo Premium", "Contenido infantil"] },
};

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
    if (path === "catalog" && method === "GET") {
      const url = new URL(req.url);
      let query = db.from("content_items").select("*, editorials(name)").eq("status", "published");
      const type = url.searchParams.get("type");
      const search = url.searchParams.get("search");
      if (type) query = query.eq("type", type);
      if (search) query = query.ilike("title", `%${search}%`);
      const { data, error: qErr } = await query.order("published_at", { ascending: false });
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
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const id = pathSegments[1];
      const { data: content } = await db.from("content_items").select("*").eq("id", id).eq("status", "published").single();
      if (!content) return error("Content not found", 404);
      const { data: payment } = await db.from("payments").insert({
        user_id: auth.user!.id,
        type: "purchase",
        description: content.title,
        amount: content.price ?? 0,
        status: "completed",
        content_id: id,
      }).select().single();
      await db.from("user_library").upsert({ user_id: auth.user!.id, content_id: id, progress: 0 }, { onConflict: "user_id,content_id" });
      await db.from("content_items").update({ purchases: (content.purchases ?? 0) + 1 }).eq("id", id);
      return json({ payment, success: true });
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
    if (path === "subscriptions/plans" && method === "GET") return json(SUBSCRIPTION_PLANS);

    if (path === "subscriptions/me" && method === "GET") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const { data } = await db.from("subscriptions").select("*").eq("user_id", auth.user!.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return json(data);
    }

    if (path === "subscriptions/subscribe" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ plan: keyof typeof SUBSCRIPTION_PLANS }>(req);
      const planInfo = SUBSCRIPTION_PLANS[body.plan];
      if (!planInfo) return error("Invalid plan");
      await db.from("subscriptions").update({ status: "cancelled" }).eq("user_id", auth.user!.id).eq("status", "active");
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const { data: sub } = await db.from("subscriptions").insert({
        user_id: auth.user!.id,
        plan: body.plan,
        status: "active",
        price: planInfo.price,
        expires_at: expiresAt.toISOString(),
      }).select().single();
      await db.from("payments").insert({
        user_id: auth.user!.id,
        type: "subscription",
        description: `Suscripción ${planInfo.name} — Mensual`,
        amount: planInfo.price,
        status: "completed",
      });
      return json(sub);
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
      const { data } = await db.from("user_lists").select("*, list_items(content_id, content_items(title, type, cover_url))").eq("user_id", auth.user!.id).order("created_at", { ascending: false });
      return json(data ?? []);
    }

    if (path === "lists" && method === "POST") {
      const auth = await requireAuth(req, ["user"]);
      if (auth.err) return auth.err;
      const body = await parseBody<{ name: string }>(req);
      const { data } = await db.from("user_lists").insert({ user_id: auth.user!.id, name: body.name }).select().single();
      return json(data);
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
        status: auth.user!.role === "publisher" ? "review" : "draft",
      }).select().single();
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
