import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "pf_session";
const ISSUER = "personal-finance";
const AUDIENCE = "personal-finance:web";

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  // Middleware runs at the edge; if JWT_SECRET isn't set, treat as unauthenticated.
  if (!secret) return new TextEncoder().encode("missing-secret");
  return new TextEncoder().encode(secret);
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getKey(), { issuer: ISSUER, audience: AUDIENCE });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const authed = await isAuthed(req);

  // Auth pages: redirect away when already logged in
  if ((pathname === "/login" || pathname === "/signup") && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protected pages
  const protectedPrefixes = [
    "/dashboard",
    "/transactions",
    "/analytics",
    "/settings",
  ];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isProtected) return NextResponse.next();
  if (authed) return NextResponse.next();

  const next = `${pathname}${search}`;
  const url = new URL("/login", req.url);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/analytics/:path*", "/settings/:path*", "/login", "/signup"],
};

