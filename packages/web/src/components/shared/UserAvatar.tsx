import { cn } from "@/lib/utils";

export function getInitials(name: string | null | undefined, email?: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
  className,
}: {
  name?: string | null;
  email?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl",
  };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? "Avatar"}
        className={cn("rounded-full object-cover ring-2 ring-border", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground ring-2 ring-border",
        sizes[size],
        className,
      )}
    >
      {getInitials(name, email)}
    </div>
  );
}
