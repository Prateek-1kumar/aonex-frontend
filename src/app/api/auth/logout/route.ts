import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aonex_token")?.value;

  // Best-effort server-side session revocation. The backend logout reads the
  // Bearer token, revokes its session (jti), and is idempotent. We still clear
  // the cookie below even if the backend is unreachable, so logout never fails.
  if (token) {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* ignore — cookie is cleared regardless */
    }
  }

  cookieStore.delete("aonex_token");
  return NextResponse.json({ success: true });
}
