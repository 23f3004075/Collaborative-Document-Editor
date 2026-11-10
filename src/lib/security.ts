import crypto from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    "ajaia-docs-dev-session-secret-change-in-production"
  );
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function signPayload(payloadBase64: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    exp: Date.now() + SESSION_TTL_MS,
  });
  const payloadBase64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token?: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) return null;

  const expectedSig = signPayload(payloadBase64);
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString("utf8")
    ) as { uid?: unknown; exp?: unknown };
    if (typeof decoded.uid !== "string" || typeof decoded.exp !== "number") {
      return null;
    }
    if (decoded.exp < Date.now()) {
      return null;
    }
    return decoded.uid;
  } catch {
    return null;
  }
}

