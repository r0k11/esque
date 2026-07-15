import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";

// Без "server-only" и next/headers: используется и в proxy (Node-рантайм), и на сервере.
const encodedKey = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-me"
);

export const SESSION_COOKIE = "esque_session";

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
