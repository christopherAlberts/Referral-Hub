import { CapacityStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export function roleHome(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.PSYCHIATRIST:
      return "/psychiatrist";
    case Role.THERAPIST:
      return "/therapist";
    default:
      return "/login";
  }
}

export async function requireSession(roles?: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (roles && !roles.includes(session.user.role)) {
    redirect(roleHome(session.user.role));
  }
  return session;
}

export function statusLabel(status: CapacityStatus | null | undefined): string {
  switch (status) {
    case CapacityStatus.AVAILABLE:
      return "Available";
    case CapacityStatus.SOME_CAPACITY:
      return "Some capacity";
    case CapacityStatus.NO_CAPACITY:
      return "No capacity";
    default:
      return "Not updated";
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
