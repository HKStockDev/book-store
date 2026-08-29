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
