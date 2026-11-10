import { NextResponse } from "next/server";
import { requireApprovedUserFromRequest } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { listAllDocumentsForAdmin } from "@/lib/repositories/documentRepository";
import {
  listAllUsers,
  requireAdminUser,
} from "@/lib/repositories/userRepository";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const activeUser = await requireApprovedUserFromRequest(request);
    await requireAdminUser(activeUser.id);

    const [users, documents] = await Promise.all([
      listAllUsers(),
      listAllDocumentsForAdmin(activeUser.id),
    ]);

    return NextResponse.json({ users, documents });
  } catch (error) {
    return handleApiError("GET /api/admin/overview", error);
  }
}

