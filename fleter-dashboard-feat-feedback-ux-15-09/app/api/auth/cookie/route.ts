import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token } = body;
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días (Firebase renueva el token automáticamente)
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { maxAge: 0, path: "/" });
  return res;
}
