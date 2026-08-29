import type { UserRole } from "./types";

export function getHomeForRole(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "publisher") return "/publisher";
  return "/browse";
}
