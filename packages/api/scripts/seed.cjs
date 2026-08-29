/**
 * IWWEI demo seed — reset demo data and create full platform sample.
 */
require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACTORS = [
  { email: "admin@iwwei.demo", fullName: "Admin IWWEI", role: "admin" },
  { email: "admin2@iwwei.demo", fullName: "Laura Martínez", role: "admin" },
  { email: "admin3@iwwei.demo", fullName: "Miguel Sánchez", role: "admin" },
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
  {
    email: "publisher@alba.demo",
    fullName: "Elena Ruiz Alba",
    role: "publisher",
    editorial: {
      name: "Editorial Alba",
      contact_email: "contacto@editorialalba.com",
      status: "active",
      cpm_rate: 2.75,
      total_revenue: 89000,
      description: "Literatura contemporánea y ensayo en español.",
    },
  },
  {
    email: "publisher@anagrama.demo",
    fullName: "Pablo Torres Anagrama",
    role: "publisher",
    editorial: {
      name: "Anagrama",
      contact_email: "digital@anagrama-ed.es",
      status: "active",
      cpm_rate: 3.25,
      total_revenue: 156000,
      description: "Clásicos y narrativa de autor en edición digital.",
    },
  },
  {
    email: "publisher@salamandra.demo",
    fullName: "Sofía Herrera",
    role: "publisher",
    editorial: {
      name: "Salamandra",
      contact_email: "editorial@salamandra.es",
      status: "pending",
      cpm_rate: 2.8,
      total_revenue: 0,
      description: "Ciencia ficción, fantasía y género literario.",
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
  const albaId = editorialIds["publisher@alba.demo"];
  const anagramaId = editorialIds["publisher@anagrama.demo"];
  const salamandraId = editorialIds["publisher@salamandra.demo"];
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
    {
      title: "La Sombra del Viento",
      description: "Novela de misterio ambientada en la Barcelona de posguerra.",
      type: "book",
      editorial_id: planetaId,
      status: "published",
      price: 11.99,
      author: "Carlos Ruiz Zafón",
      cover_url: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
      impressions: 52100,
      purchases: 1870,
      published_at: "2024-03-20T00:00:00Z",
    },
    {
      title: "1984",
      description: "Distopía clásica sobre vigilancia y control totalitario.",
      type: "book",
      editorial_id: planetaId,
      status: "published",
      price: 8.49,
      author: "George Orwell",
      cover_url: "https://images.unsplash.com/photo-1497633768975-9f4ea771be40?w=400",
      impressions: 89400,
      purchases: 3120,
      published_at: "2023-11-01T00:00:00Z",
    },
    {
      title: "Dune",
      description: "Épica de ciencia ficción en el desierto de Arrakis.",
      type: "book",
      editorial_id: planetaId,
      status: "draft",
      price: 13.99,
      author: "Frank Herbert",
      cover_url: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400",
      impressions: 0,
      purchases: 0,
    },
    {
      title: "Rayuela",
      description: "Obra maestra del boom latinoamericano con múltiples lecturas.",
      type: "book",
      editorial_id: anagramaId,
      status: "published",
      price: 10.99,
      author: "Julio Cortázar",
      cover_url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400",
      impressions: 34200,
      purchases: 980,
      published_at: "2024-09-10T00:00:00Z",
    },
    {
      title: "El Nombre de la Rosa",
      description: "Thriller medieval con erudición y misterio monástico.",
      type: "book",
      editorial_id: albaId,
      status: "published",
      price: 9.49,
      author: "Umberto Eco",
      cover_url: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400",
      impressions: 28700,
      purchases: 760,
      published_at: "2025-02-14T00:00:00Z",
    },
    {
      title: "El Aleph",
      description: "Cuentos y relatos del universo borgiano.",
      type: "book",
      editorial_id: albaId,
      status: "published",
      price: 7.99,
      author: "Jorge Luis Borges",
      cover_url: "https://images.unsplash.com/photo-1524995997941-a1c2e315a42f?w=400",
      impressions: 19800,
      purchases: 540,
      published_at: "2024-12-01T00:00:00Z",
    },
    {
      title: "Los Pilares de la Tierra",
      description: "Saga histórica sobre la construcción de una catedral medieval.",
      type: "book",
      editorial_id: salamandraId,
      status: "review",
      price: 15.99,
      author: "Ken Follett",
      cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      impressions: 0,
      purchases: 0,
    },
    {
      title: "Orgullo y Prejuicio",
      description: "Romance clásico de la Inglaterra del siglo XIX.",
      type: "book",
      editorial_id: anagramaId,
      status: "published",
      price: 6.99,
      author: "Jane Austen",
      cover_url: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400",
      impressions: 41500,
      purchases: 1420,
      published_at: "2023-07-04T00:00:00Z",
    },
    {
      title: "La Casa de los Espíritus",
      description: "Saga familiar que atraviesa el siglo XX chileno.",
      type: "book",
      editorial_id: anagramaId,
      status: "published",
      price: 11.49,
      author: "Isabel Allende",
      cover_url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
      impressions: 36800,
      purchases: 1105,
      published_at: "2025-04-22T00:00:00Z",
    },
    {
      title: "El Principito",
      description: "Fábula filosófica para lectores de todas las edades.",
      type: "book",
      editorial_id: albaId,
      status: "published",
      price: 5.99,
      author: "Antoine de Saint-Exupéry",
      cover_url: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400",
      impressions: 76200,
      purchases: 2890,
      published_at: "2023-01-15T00:00:00Z",
    },
  ];

  const { data: content, error: contentError } = await admin.from("content_items").insert(contentRows).select();
  if (contentError) throw new Error(`content: ${contentError.message}`);

  const contentCountByEditorial = content.reduce((counts, item) => {
    counts[item.editorial_id] = (counts[item.editorial_id] || 0) + 1;
    return counts;
  }, {});
  for (const [editorialId, count] of Object.entries(contentCountByEditorial)) {
    await admin.from("editorials").update({ content_count: count }).eq("id", editorialId);
  }

  const findContent = (titlePart) => content.find((c) => c.title.includes(titlePart)).id;
  const quijoteId = findContent("Quijote");
  const historiaId = findContent("Historia");
  const mortadeloId = findContent("Mortadelo");
  const cienAnosId = findContent("Cien Años");
  const sombraId = findContent("Sombra del Viento");
  const orwellId = findContent("1984");
  const rayuelaId = findContent("Rayuela");
  const nombreRosaId = findContent("Nombre de la Rosa");
  const principitoId = findContent("Principito");

  console.log("4. Inserting subscriptions...");
  await admin.from("subscriptions").insert([
    { user_id: mariaId, plan: "premium", status: "active", price: 9.99, expires_at: "2026-09-29T00:00:00Z" },
    { user_id: carlosId, plan: "basic", status: "active", price: 4.99, expires_at: "2026-09-29T00:00:00Z" },
  ]);

  console.log("5. Inserting user library...");
  await admin.from("user_library").insert([
    { user_id: mariaId, content_id: quijoteId, progress: 45.5, offline_available: true, last_read_at: "2026-08-28T10:00:00Z" },
    { user_id: mariaId, content_id: mortadeloId, progress: 12.0, offline_available: false, last_read_at: "2026-08-27T15:30:00Z" },
    { user_id: mariaId, content_id: sombraId, progress: 67.0, offline_available: true, last_read_at: "2026-08-26T20:15:00Z" },
    { user_id: mariaId, content_id: principitoId, progress: 100.0, offline_available: true, last_read_at: "2026-08-20T09:00:00Z" },
    { user_id: carlosId, content_id: cienAnosId, progress: 78.2, offline_available: true, last_read_at: "2026-08-29T08:00:00Z" },
    { user_id: carlosId, content_id: orwellId, progress: 33.5, offline_available: false, last_read_at: "2026-08-25T18:45:00Z" },
    { user_id: carlosId, content_id: nombreRosaId, progress: 22.0, offline_available: false, last_read_at: "2026-08-24T12:30:00Z" },
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
    { list_id: listaFav.id, content_id: sombraId },
    { list_id: listaFav.id, content_id: principitoId },
    { list_id: listaLeer.id, content_id: historiaId },
    { list_id: listaLeer.id, content_id: rayuelaId },
    { list_id: listaLeer.id, content_id: orwellId },
  ]);

  console.log("8. Inserting reviews...");
  await admin.from("reviews").insert([
    { user_id: mariaId, content_id: quijoteId, rating: 5, comment: "Una edición magnífica. El lector digital es muy fluido." },
    { user_id: carlosId, content_id: cienAnosId, rating: 4, comment: "Gran experiencia de lectura, aunque echo de menos notas al pie." },
    { user_id: mariaId, content_id: mortadeloId, rating: 5, comment: "¡Nostalgia pura! Los cómics se ven perfectos en pantalla." },
    { user_id: mariaId, content_id: sombraId, rating: 5, comment: "Atmósfera perfecta. No pude dejar de leer." },
    { user_id: carlosId, content_id: orwellId, rating: 5, comment: "Tremendamente actual. Edición impecable." },
    { user_id: mariaId, content_id: principitoId, rating: 4, comment: "Un clásico atemporal con ilustraciones preciosas." },
    { user_id: carlosId, content_id: nombreRosaId, rating: 4, comment: "Intriga y erudición en cada capítulo." },
    { user_id: mariaId, content_id: rayuelaId, rating: 3, comment: "Desafiante pero gratificante. Ideal para releer." },
  ]);

  console.log("9. Inserting payments...");
  await admin.from("payments").insert([
    { user_id: mariaId, type: "subscription", description: "Suscripción Premium — Mensual", amount: 9.99, status: "completed", created_at: "2026-08-01T00:00:00Z" },
    { user_id: carlosId, type: "subscription", description: "Suscripción Básica — Mensual", amount: 4.99, status: "completed", created_at: "2026-08-01T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "El Quijote — Edición Digital", amount: 9.99, status: "completed", content_id: quijoteId, created_at: "2026-08-15T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "Historia de España — Tomo III", amount: 14.99, status: "pending", content_id: historiaId, created_at: "2026-08-28T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "La Sombra del Viento", amount: 11.99, status: "completed", content_id: sombraId, created_at: "2026-08-10T00:00:00Z" },
    { user_id: carlosId, type: "purchase", description: "1984", amount: 8.49, status: "completed", content_id: orwellId, created_at: "2026-08-18T00:00:00Z" },
    { user_id: mariaId, type: "purchase", description: "El Principito", amount: 5.99, status: "completed", content_id: principitoId, created_at: "2026-07-22T00:00:00Z" },
    { user_id: carlosId, type: "purchase", description: "El Nombre de la Rosa", amount: 9.49, status: "completed", content_id: nombreRosaId, created_at: "2026-08-05T00:00:00Z" },
  ]);

  console.log("10. Inserting CPM settlements...");
  await admin.from("cpm_settlements").insert([
    { editorial_id: planetaId, period: "2026-07", impressions: 1250000, cpm_rate: 2.5, amount: 3125, status: "paid" },
    { editorial_id: normaId, period: "2026-07", impressions: 890000, cpm_rate: 3.0, amount: 2670, status: "paid" },
    { editorial_id: albaId, period: "2026-07", impressions: 420000, cpm_rate: 2.75, amount: 1155, status: "paid" },
    { editorial_id: anagramaId, period: "2026-07", impressions: 680000, cpm_rate: 3.25, amount: 2210, status: "paid" },
    { editorial_id: planetaId, period: "2026-08", impressions: 1180000, cpm_rate: 2.5, amount: 2950, status: "pending" },
    { editorial_id: normaId, period: "2026-08", impressions: 920000, cpm_rate: 3.0, amount: 2760, status: "pending" },
    { editorial_id: albaId, period: "2026-08", impressions: 395000, cpm_rate: 2.75, amount: 1086.25, status: "pending" },
    { editorial_id: anagramaId, period: "2026-08", impressions: 710000, cpm_rate: 3.25, amount: 2307.5, status: "pending" },
  ]);

  console.log("11. Inserting promotions...");
  await admin.from("promotions").insert([
    { name: "Lanzamiento Verano 2026", editorial_id: planetaId, status: "active", start_date: "2026-06-01", end_date: "2026-08-31", budget: 5000, spent: 3200, impressions: 450000, clicks: 12500, conversions: 890 },
    { name: "Cómics Destacados", editorial_id: normaId, status: "active", start_date: "2026-07-15", end_date: "2026-09-15", budget: 3000, spent: 1800, impressions: 280000, clicks: 8900, conversions: 456 },
    { name: "Podcast Premium", editorial_id: normaId, status: "scheduled", start_date: "2026-09-01", end_date: "2026-10-31", budget: 2000, spent: 0, impressions: 0, clicks: 0, conversions: 0 },
    { name: "Clásicos de Autor", editorial_id: anagramaId, status: "active", start_date: "2026-07-01", end_date: "2026-09-30", budget: 2500, spent: 1400, impressions: 195000, clicks: 6200, conversions: 312 },
    { name: "Literatura Contemporánea", editorial_id: albaId, status: "active", start_date: "2026-08-01", end_date: "2026-10-31", budget: 1800, spent: 450, impressions: 78000, clicks: 2100, conversions: 98 },
  ]);

  console.log("\nSeed complete.\n");
  console.log("Demo accounts (password for all: Demo1234!):\n");
  console.log("  admin      admin@iwwei.demo");
  console.log("  admin      admin2@iwwei.demo");
  console.log("  admin      admin3@iwwei.demo");
  console.log("  publisher  publisher@planeta.demo");
  console.log("  publisher  publisher@norma.demo");
  console.log("  publisher  publisher@alba.demo");
  console.log("  publisher  publisher@anagrama.demo");
  console.log("  publisher  publisher@salamandra.demo (pending editorial)");
  console.log("  user       user@iwwei.demo");
  console.log("  user       carlos.ruiz@email.com");
  console.log("  user       ana.lopez@email.com (suspended)\n");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
