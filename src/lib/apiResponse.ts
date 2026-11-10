import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getErrorStatusCode, getSafeErrorMessage } from "./errors";

export function handleApiError(context: string, error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const firstMessage = error.errors[0]?.message ?? "Invalid request payload";
    return NextResponse.json({ error: firstMessage }, { status: 400 });
  }

  const statusCode = getErrorStatusCode(error);
  const message = getSafeErrorMessage(error);

  if (statusCode >= 500) {
    console.error(`[API Error - ${context}]`, error);
  }

  return NextResponse.json({ error: message }, { status: statusCode });
}

