import type { PermissionLevel, User } from "@/types/domain";
import { Crown, Eye, Pencil } from "lucide-react";

interface RoleBadgeProps {
  role: PermissionLevel;
}

const ROLE_STYLES: Record<
  PermissionLevel,
  { label: string; classes: string; Icon: typeof Crown }
> = {
  OWNER: {
    label: "Owner",
    classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Icon: Crown,
  },
  EDIT: {
    label: "Can Edit",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: Pencil,
  },
  VIEW: {
    label: "View Only",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Eye,
  },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const { label, classes, Icon } = ROLE_STYLES[role];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${classes}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

interface UserAvatarProps {
  user: Pick<User, "name" | "initials" | "avatarColor">;
  size?: "sm" | "md";
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <span
      title={user.name}
      className={`${sizeClass} ${user.avatarColor} text-white font-semibold rounded-full inline-flex items-center justify-center shrink-0 ring-2 ring-white`}
    >
      {user.initials}
    </span>
  );
}

