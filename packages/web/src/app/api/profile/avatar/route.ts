import { getAdminClient, getUserFromToken } from "@/lib/supabase-server";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ message: "Missing or invalid authorization header" }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user || user.role !== "user") {
    return Response.json({ message: "Insufficient permissions" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ message: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ message: "Formato no válido. Usa JPG, PNG o WebP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ message: "La imagen no puede superar 2 MB" }, { status: 400 });
  }

  const db = getAdminClient();
  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${user.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await db.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  let avatarUrl: string;
  if (uploadError) {
    avatarUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
  } else {
    avatarUrl = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { data, error: updateError } = await db
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("avatar_url")
    .single();

  if (updateError) {
    return Response.json({ message: updateError.message }, { status: 400 });
  }

  return Response.json({ avatar_url: data.avatar_url });
}
