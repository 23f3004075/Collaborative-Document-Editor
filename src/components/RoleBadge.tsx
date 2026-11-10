import type {
  DocumentApprovalStatus,
  PermissionLevel,
  SystemRole,
  User,
} from "@/types/domain";
import {
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  FileEdit,
  Pencil,
  ShieldCheck,
  XCircle,
} from "lucide-react";

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

const APPROVAL_STYLES: Record<
  DocumentApprovalStatus,
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  DRAFT: {
    label: "Draft",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: FileEdit,
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: "Changes Requested",
    classes: "bg-red-50 text-red-700 border-red-200",
    Icon: XCircle,
  },
};

export function ApprovalBadge({ status }: { status: DocumentApprovalStatus }) {
  const { label, classes, Icon } = APPROVAL_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${classes}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export function SystemRoleBadge({ role }: { role: SystemRole }) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
        <ShieldCheck className="w-3 h-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      Member
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
