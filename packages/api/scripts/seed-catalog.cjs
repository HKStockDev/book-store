/**
 * Seed 300+ published books from Open Library into Supabase.
 * Does NOT wipe existing data. Safe to re-run (skips duplicate titles).
 *
 * Usage: node scripts/seed-catalog.cjs
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in packages/api/.env
 */
require("dotenv").config({ path: require("node:path").join(__dirname, "../.env") });
const { createClient } = require("@supabase/supabase-js");

const TARGET_TOTAL = 320;
const BATCH_SIZE = 50;

const CATALOG_CATEGORIES = [
  { genre: "Ficción", query: "subject:fiction", type: "book" },
  { genre: "Ciencia ficción", query: "subject:science_fiction", type: "book" },
  { genre: "Historia", query: "subject:history", type: "book" },
  { genre: "Biografía", query: "subject:biography", type: "book" },
  { genre: "Poesía", query: "subject:poetry", type: "book" },
  { genre: "Misterio", query: "subject:detective_and_mystery_stories", type: "book" },
  { genre: "Romance", query: "subject:romance", type: "book" },
  { genre: "Infantil", query: "subject:juvenile_fiction", type: "book" },
  { genre: "Filosofía", query: "subject:philosophy", type: "book" },
  { genre: "Aventura", query: "subject:adventure", type: "book" },
  { genre: "Clásicos", query: "subject:classic_literature", type: "book" },
  { genre: "Ensayo", query: "subject:essays", type: "book" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function pickPrice(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  const cents = 499 + (Math.abs(hash) % 1501);
  return Math.round(cents) / 100;
}

async function fetchOpenLibrary(query, offset, limit) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
    fields: "key,title,author_name,cover_i,first_publish_year,subject",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error(`Open Library HTTP ${res.status} for ${query}`);
  return res.json();
}

async function fetchCategoryBooks(category, perCategory) {
  const results = [];
  const seen = new Set();
  let offset = 0;

  while (results.length < perCategory && offset < 800) {
    const data = await fetchOpenLibrary(category.query, offset, 100);
    const docs = data.docs ?? [];
    if (!docs.length) break;

    for (const doc of docs) {
      if (!doc.title?.trim() || !doc.cover_i) continue;
      const key = normalizeTitle(doc.title);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        title: doc.title.trim(),
        author: doc.author_name?.[0] ?? "Autor desconocido",
        cover_url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
        genre: category.genre,
        type: category.type,
        description: doc.first_publish_year
          ? `Obra catalogada en Open Library (${doc.first_publish_year}). Género: ${category.genre}.`
          : `Obra catalogada en Open Library. Género: ${category.genre}.`,
      });
      if (results.length >= perCategory) break;
    }

    offset += 100;
    await sleep(250);
  }

  return results;
}

async function ensureEditorials(admin) {
  const { data: existing } = await admin.from("editorials").select("id, name, status").eq("status", "active");
  if (existing?.length) return existing;

  console.log("No active editorials found. Creating default catalog editorial...");
  const { data: publishers } = await admin.from("profiles").select("id").eq("role", "publisher").limit(1);
  let ownerId = publishers?.[0]?.id;

  if (!ownerId) {
    const { data: authData, error } = await admin.auth.admin.createUser({
      email: "catalog@iwwei.demo",
      password: "Demo1234!",
      email_confirm: true,
      user_metadata: { full_name: "IWWEI Catálogo", role: "publisher" },
    });
    if (error && !error.message.includes("already")) throw error;
    if (authData?.user) {
      ownerId = authData.user.id;
      await admin.from("profiles").upsert({
        id: ownerId,
        email: "catalog@iwwei.demo",
        full_name: "IWWEI Catálogo",
        role: "publisher",
        status: "active",
        onboarding_completed: true,
      });
    } else {
      const { data: profile } = await admin.from("profiles").select("id").eq("email", "catalog@iwwei.demo").single();
      ownerId = profile?.id;
    }
  }

  const { data: editorial, error: edErr } = await admin
    .from("editorials")
    .insert({
      name: "IWWEI Catálogo Digital",
      contact_email: "catalog@iwwei.demo",
      owner_id: ownerId,
      status: "active",
      cpm_rate: 2.5,
      total_revenue: 0,
      content_count: 0,
      description: "Catálogo principal de libros digitales IWWEI.",
    })
    .select()
    .single();

  if (edErr) throw new Error(`create editorial: ${edErr.message}`);
  return [editorial];
}

async function ensureGenreColumn(admin) {
  const { error } = await admin.rpc("exec_sql", { query: "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS genre TEXT" });
  if (error) {
    // rpc may not exist; column might already exist from manual migration
    console.log("Note: genre column migration skipped (apply add-genre-migration.sql if needed).");
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

  console.log("\nIWWEI - seeding catalog from Open Library\n");

  const editorials = await ensureEditorials(admin);
  const editorialIds = editorials.map((e) => e.id);
  console.log(`Using ${editorialIds.length} editorial(s)`);

  const { data: existingRows } = await admin.from("content_items").select("title");
  const existingTitles = new Set((existingRows ?? []).map((r) => normalizeTitle(r.title)));
  console.log(`Existing content items: ${existingTitles.size}`);

  const perCategory = Math.ceil(TARGET_TOTAL / CATALOG_CATEGORIES.length);
  const allBooks = [];

  for (const category of CATALOG_CATEGORIES) {
    console.log(`Fetching "${category.genre}" (${perCategory} target)...`);
    const books = await fetchCategoryBooks(category, perCategory);
    console.log(`  -> ${books.length} books with covers`);
    allBooks.push(...books);
  }

  const uniqueBooks = [];
  const globalSeen = new Set(existingTitles);
  for (const book of allBooks) {
    const key = normalizeTitle(book.title);
    if (globalSeen.has(key)) continue;
    globalSeen.add(key);
    uniqueBooks.push(book);
  }

  console.log(`\nPrepared ${uniqueBooks.length} new books to insert`);

  let inserted = 0;
  for (let i = 0; i < uniqueBooks.length; i += BATCH_SIZE) {
    const batch = uniqueBooks.slice(i, i + BATCH_SIZE).map((book, idx) => ({
      title: book.title,
      description: book.description,
      type: book.type,
      editorial_id: editorialIds[(i + idx) % editorialIds.length],
      status: "published",
      price: pickPrice(book.title),
      author: book.author,
      cover_url: book.cover_url,
      genre: book.genre,
      impressions: Math.floor(Math.random() * 50000) + 100,
      purchases: Math.floor(Math.random() * 500),
      published_at: new Date(Date.now() - Math.random() * 730 * 86400000).toISOString(),
    }));

    const { error } = await admin.from("content_items").insert(batch);
    if (error) throw new Error(`insert batch: ${error.message}`);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${uniqueBooks.length}`);
  }

  const { count } = await admin
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  console.log(`\nDone. Published catalog items: ${count ?? "?"}\n`);
}

main().catch((err) => {
  console.error("Catalog seed failed:", err.message);
  process.exit(1);
});
