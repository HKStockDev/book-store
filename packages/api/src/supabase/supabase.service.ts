import { Global, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser, Profile, UserRole } from "../common/types";

@Global()
@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;
  private adminClient!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>("SUPABASE_URL");
    const anonKey = this.config.getOrThrow<string>("SUPABASE_ANON_KEY");
    const serviceKey = this.config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");

    this.client = createClient(url, anonKey);
    this.adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  async getUserFromToken(accessToken: string): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }

    const profile = await this.getProfile(data.user.id);
    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name,
      editorialId: profile.editorial_id,
      accessToken,
    };
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.adminClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Profile;
  }

  toAuthUser(profile: Profile, accessToken: string): AuthUser {
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      fullName: profile.full_name,
      editorialId: profile.editorial_id,
      accessToken,
    };
  }
}
