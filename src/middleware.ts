import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isProtected = ["/chat", "/api/consensus", "/api/history"].some(p => pathname.startsWith(p));
  if (isProtected && !user) return NextResponse.redirect(new URL("/login", request.url));
  if (pathname === "/login" && user) return NextResponse.redirect(new URL("/chat", request.url));
  return response;
}

export const config = {
  matcher: ["/chat", "/api/consensus/:path*", "/api/history/:path*", "/login"],
};