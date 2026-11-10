import { cookies } from "next/headers";
import { PERSONA_COOKIE_NAME, resolveValidPersonaId } from "./personas";

export async function getActivePersonaIdFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(PERSONA_COOKIE_NAME)?.value;
  return resolveValidPersonaId(cookieValue);
}

export function getActivePersonaIdFromRequest(request: Request): string {
  const headerUserId = request.headers.get("x-ajaia-persona-id");
  if (headerUserId) {
    return resolveValidPersonaId(headerUserId);
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${PERSONA_COOKIE_NAME}=([^;]+)`)
  );
  const decoded = match ? decodeURIComponent(match[1]) : null;
  return resolveValidPersonaId(decoded);
}

