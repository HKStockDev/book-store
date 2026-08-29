import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { AuthUser } from "../common/types";
import { LoginDto, SignupDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const role = dto.role ?? "user";

    if (role === "publisher" && !dto.editorialName?.trim()) {
      throw new BadRequestException("editorialName is required for publisher signup");
    }

    const admin = this.supabase.getAdminClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        full_name: dto.fullName,
        role,
      },
    });

    if (authError) {
      if (authError.message.includes("already")) {
        throw new ConflictException("Email already registered");
      }
      throw new BadRequestException(authError.message);
    }

    const userId = authData.user.id;

    let editorialId: string | null = null;
    if (role === "publisher" && dto.editorialName) {
      const { data: editorial, error: edError } = await admin
        .from("editorials")
        .insert({
          name: dto.editorialName.trim(),
          contact_email: dto.email,
          owner_id: userId,
          status: "pending",
        })
        .select()
        .single();

      if (edError) {
        throw new BadRequestException(edError.message);
      }

      editorialId = editorial.id;
    }

    await this.supabase.updateProfile(userId, {
      full_name: dto.fullName,
      role,
      editorial_id: editorialId,
    });

    return this.login({ email: dto.email, password: dto.password });
  }

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const profile = await this.supabase.getProfile(data.user.id);
    if (!profile) {
      throw new UnauthorizedException("Profile not found");
    }

    if (profile.status === "suspended") {
      throw new UnauthorizedException("Account suspended");
    }

    return {
      user: this.supabase.toAuthUser(profile, data.session.access_token),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }

  async me(user: AuthUser) {
    const profile = await this.supabase.getProfile(user.id);
    if (!profile) {
      throw new UnauthorizedException("Profile not found");
    }

    let editorial = null;
    if (profile.editorial_id) {
      const { data } = await this.supabase
        .getAdminClient()
        .from("editorials")
        .select("id, name, status, cpm_rate")
        .eq("id", profile.editorial_id)
        .single();
      editorial = data;
    }

    return {
      user: this.supabase.toAuthUser(profile, user.accessToken),
      editorial,
    };
  }

  async logout(accessToken: string) {
    const admin = this.supabase.getAdminClient();
    const { data } = await admin.auth.getUser(accessToken);
    if (data.user) {
      await admin.auth.admin.signOut(data.user.id);
    }
    return { success: true };
  }
}
