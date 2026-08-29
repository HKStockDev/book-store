/**
 * IWWEI demo seed — reset demo data and create full platform sample.
 */
require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACTORS = [
  { email: "admin@iwwei.demo", fullName: "Admin IWWEI", role: "admin" },
  {
    email: "publisher@planeta.demo",
    fullName: "Carlos Editor Planeta",
    role: "publisher",
    editorial: {
      name: "Editorial Planeta",
      contact_email: "digital@planeta.es",
      status: "active",
      cpm_rate: 2.5,
      total_revenue: 245000,
      description: "Editorial líder en literatura y no ficción en español.",
    },
  },
  {
    email: "publisher@norma.demo",
    fullName: "Ana Editor Norma",
    role: "publisher",
    editorial: {
      name: "Norma Editorial",
      contact_email: "comics@norma.es",
      status: "active",
      cpm_rate: 3.0,
      total_revenue: 128000,
      description: "Especialistas en cómics, manga y contenido visual.",
    },
  },
  { email: "user@iwwei.demo", fullName: "María García", role: "user" },
  { email: "carlos.ruiz@email.com", fullName: "Carlos Ruiz", role: "user" },
  { email: "ana.lopez@email.com", fullName: "Ana López", role: "user", status: "suspended" },
];

async function findUserByEmail(admin, email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

async function ensureUser(admin, actor) {
  let user = await findUserByEmail(admin, actor.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: actor.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: actor.fullName, role: actor.role },
    });
    if (error) throw new Error(`createUser ${actor.email}: ${error.message}`);
    user = data.user;
    console.log(`  + created auth user: ${actor.email}`);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
      user_metadata: { full_name: actor.fullName, role: actor.role },
    });
    console.log(`  ~ updated auth user: ${actor.email}`);
  }

  await admin.from("profiles").upsert(
    {
      id: user.id,
      email: actor.email,
      full_name: actor.fullName,
      role: actor.role,
      status: actor.status ?? "active",
      onboarding_completed: actor.role === "user" && actor.email !== "user@iwwei.demo" ? true : actor.role !== "user",
    },
    { onConflict: "id" },
  );

  return user.id;
}

async function clearAllData(admin) {
  const tables = [
    "list_items",
    "user_lists",
    "reviews",
    "user_library",
    "user_interests",
    "subscriptions",
    "payments",
    "promotions",
    "cpm_settlements",
    "content_items",
    "editorials",
  ];
  for (const table of tables) {
    await admin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\nIWWEI — seeding demo data\n");
  console.log("1. Clearing all data...");
  await clearAllData(admin);

  console.log("2. Creating demo actors...");
  const userIds = {};
  const editorialIds = {};

  for (const actor of DEMO_ACTORS) {
    const userId = await ensureUser(admin, actor);
    userIds[actor.email] = userId;

    if (actor.editorial) {
      const { data: editorial, error } = await admin
        .from("editorials")
        .insert({ ...actor.editorial, owner_id: userId, content_count: 0 })
        .select()
        .single();
      if (error) throw new Error(`editorial ${actor.email}: ${error.message}`);
      editorialIds[actor.email] = editorial.id;
      await admin.from("profiles").update({ editorial_id: editorial.id }).eq("id", userId);
      console.log(`  + editorial: ${actor.editorial.name}`);
    }
  }

  const planetaId = editorialIds["publisher@planeta.demo"];
  const normaId = editorialIds["publisher@norma.demo"];
  const mariaId = userIds["user@iwwei.demo"];
  const carlosId = userIds["carlos.ruiz@email.com"];

  console.log("3. Inserting content...");
  const contentRows = [
    {
      title: "El Quijote — Edición Digital",
      description: "La obra cumbre de la literatura española en formato digital interactivo.",
      type: "book",
      editorial_id: planetaId,
      status: "published",
      price: 9.99,
      author: "Miguel de Cervantes",
      cover_url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
      impressions: 45200,
      purchases: 1230,
      published_at: "2023-03-01T00:00:00Z",
    },
    {
      title: "Historia de España — Tomo III",
      description: "Documento académico con visor Apryse integrado.",
      type: "document",
      editorial_id: planetaId,
      status: "published",
      price: 14.99,
      author: "Varios autores",
      cover_url: "https://images.unsplash.com/photo-1456513087680-9aaa5b645147?w=400",
      impressions: 12300,
      purchases: 456,
      integration: "apryse",
      published_at: "2025-06-01T00:00:00Z",
    },
    {
      title: "Mortadelo y Filemón — Colección Completa",
      description: "Todos los álbumes clásicos en formato digital vía Taddy.",
      type: "comic",
      editorial_id: normaId,
      status: "published",
      price: 24.99,
      author: "Francisco Ibáñez",
      cover_url: "https://images.unsplash.com/photo-1612036782185-39b4a8d2d2?w=400",
      impressions: 28900,
      purchases: 890,
      integration: "taddy",
      published_at: "2024-01-15T00:00:00Z",
    },
    {
      title: "Noticias del Día — Agregador",
      description: "Agregación de noticias en tiempo real vía World News API.",
      type: "news",
      editorial_id: planetaId,
      status: "published",
      price: null,
      author: "Redacción IWWEI",
      cover_url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400",
      impressions: 890000,
      purchases: 0,
      integration: "worldnews",
      published_at: "2024-01-01T00:00:00Z",
    },
    {
      title: "Crónica de la Ciencia",
      description: "Podcast semanal sobre descubrimientos científicos.",
      type: "podcast",
      editorial_id: normaId,
      status: "published",
      price: null,
      author: "Dr. Elena Martín",
      cover_url: "https://images.unsplash.com/photo-1478737276239-2f02a577ef8?w=400",
      impressions: 15600,
      purchases: 0,
      integration: "taddy",
      published_at: "2025-01-10T00:00:00Z",
    },
    {
      title: "Cien Años de Soledad",
      description: "Edición conmemorativa del clásico de García Márquez.",
      type: "book",
      editorial_id: planetaId,
      status: "published",
      price: 12.99,
      author: "Gabriel García Márquez",
      cover_url: "https://images.unsplash.com/photo-1512820790801-4159cc8fce?w=400",
      impressions: 67800,
      purchases: 2340,
      published_at: "2024-06-15T00:00:00Z",
    },
    {
      title: "Asterix en Hispania",
      description: "Clásico del cómic franco-belga en edición digital.",
      type: "comic",
      editorial_id: normaId,
      status: "review",
      price: 8.99,
      author: "Goscinny & Uderzo",
      cover_url: "https://images.unsplash.com/photo-1612178537253-bccd43705930?w=400",
      impressions: 0,
      purchases: 0,
      integration: "taddy",
    },
  ];

  const { data: content, error: contentError } = await admin.from("content_items").insert(contentRows).select();
  if (contentError) throw new Error(`content: ${contentError.message}`);

  await admin.from("editorials").update({ content_count: 4 }).eq("id", planetaId);
  await admin.from("editorials").update({ content_count: 3 }).eq("id", normaId);

  const quijoteId = content.find((c) => c.title.includes("Quijote")).id;
  const historiaId = content.find((c) => c.title.includes("Historia")).id;
  const mortadeloId = content.find((c) => c.title.includes("Mortadelo")).id;
  const cienAnosId = content.find((c) => c.title.includes("Cien Años")).id;

  console.log("4. Inserting subscriptions...");
  await admin.from("subscriptions").insert([
    { user_id: mariaId, plan: "premium", status: "active", price: 9.99, expires_at: "2026-09-29T00:00:00Z" },
    { user_id: carlosId, plan: "basic", status: "active", price: 4.99, expires_at: "2026-09-29T00:00:00Z" },
  ]);

  console.log("5. Inserting user library...");
  await admin.from("user_library").insert([
    { user_id: mariaId, content_id: quijoteId, progress: 45.5, offline_available: true, last_read_at: "2026-08-28T10:00:00Z" },
    { user_id: mariaId, content_id: mortadeloId, progress: 12.0, offline_available: false, last_read_at: "2026-08-27T15:30:00Z" },
    { user_id: carlosId, content_id: cienAnosId, progress: 78.2, offline_available: true, last_read_at: "2026-08-29T08:00:00Z" },
  ]);

  console.log("6. Inserting user interests...");
  await admin.from("user_interests").insert([
    { user_id: mariaId, category: "Ficción" },
    { user_id: mariaId, category: "Cómics" },
    { user_id: carlosId, category: "No ficción" },
    { user_id: carlosId, category: "Historia" },
  ]);

  console.log("7. Inserting lists...");
  const { data: listaFav } = await admin.from("user_lists").insert({ user_id: mariaId, name: "Mis favoritos", is_public: true }).select().single();
  const { data: listaLeer } = await admin.from("user_lists").insert({ user_id: mariaId, name: "Para leer", is_public: false }).select().single();
  await admin.from("list_items").insert([
    { list_id: listaFav.id, content_id: quijoteId },
    { list_id: listaFav.id, content_id: cienAnosId },
    { list_id: listaLeer.id, content_id: historiaId },
  ]);

  console.log("8. Inserting reviews...");
  await admin.from("reviews").insert([
    { user_id: mariaId, content_id: quijoteId, rating: 5, comment: "Una edición magnífica. El lector digital es muy fluido." },
    { user_id: carlosId, content_id: cienAnosId, rating: 4, comment: "Gran experiencia de lectura, aunque echo de menos notas al pie." },
    { user_id: mariaId, content_id: mortadeloId, rating: 5, comment: "¡Nostalgia pura! Los cómics se ven perfectos en pantalla." },
  ]);

  console.log("9. Inserting payments...");
  await admin.from("payments").insert([
    { user_id: mariaId, type: "subscription", description: "Suscripción Premium — Mensual", amount: 9.99, status: "completed", created_at: "2026-08-01T00:00:00Z" },
    { user_id: carlosId, type: "subscription", description: "Suscripción Básica — Mensual", amount: 4.99, status: "completed", created_at: "2026-08-01T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "El Quijote — Edición Digital", amount: 9.99, status: "completed", content_id: quijoteId, created_at: "2026-08-15T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "Historia de España — Tomo III", amount: 14.99, status: "pending", content_id: historiaId, created_at: "2026-08-28T00:00:00Z" },
  ]);

  console.log("10. Inserting CPM settlements...");
  await admin.from("cpm_settlements").insert([
    { editorial_id: planetaId, period: "2026-07", impressions: 1250000, cpm_rate: 2.5, amount: 3125, status: "paid" },
    { editorial_id: normaId, period: "2026-07", impressions: 890000, cpm_rate: 3.0, amount: 2670, status: "paid" },
    { editorial_id: planetaId, period: "2026-08", impressions: 1180000, cpm_rate: 2.5, amount: 2950, status: "pending" },
    { editorial_id: normaId, period: "2026-08", impressions: 920000, cpm_rate: 3.0, amount: 2760, status: "pending" },
  ]);

  console.log("11. Inserting promotions...");
  await admin.from("promotions").insert([
    { name: "Lanzamiento Verano 2026", editorial_id: planetaId, status: "active", start_date: "2026-06-01", end_date: "2026-08-31", budget: 5000, spent: 3200, impressions: 450000, clicks: 12500, conversions: 890 },
    { name: "Cómics Destacados", editorial_id: normaId, status: "active", start_date: "2026-07-15", end_date: "2026-09-15", budget: 3000, spent: 1800, impressions: 280000, clicks: 8900, conversions: 456 },
    { name: "Podcast Premium", editorial_id: normaId, status: "scheduled", start_date: "2026-09-01", end_date: "2026-10-31", budget: 2000, spent: 0, impressions: 0, clicks: 0, conversions: 0 },
  ]);

  console.log("\nSeed complete.\n");
  console.log("Demo accounts (password for all: Demo1234!):\n");
  console.log("  admin      admin@iwwei.demo");
  console.log("  publisher  publisher@planeta.demo");
  console.log("  publisher  publisher@norma.demo");
  console.log("  user       user@iwwei.demo");
  console.log("  user       carlos.ruiz@email.com");
  console.log("  user       ana.lopez@email.com (suspended)\n");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
