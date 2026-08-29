import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { UserRole } from "../../common/types";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsIn(["user", "publisher"])
  role?: Extract<UserRole, "user" | "publisher">;

  @IsOptional()
  @IsString()
  editorialName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
