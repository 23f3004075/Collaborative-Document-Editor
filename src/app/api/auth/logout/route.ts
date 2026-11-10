import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/personas";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ loggedOut: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  return response;
}

