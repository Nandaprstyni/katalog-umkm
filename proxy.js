import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Jangan blokir halaman login agar tidak terjadi redirect berulang (loop)
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const rawUrl = process.env.SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
  const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabaseKey = rawKey.trim();

  // Jika konfigurasi Supabase belum ada di environment, arahkan ke login
  if (!supabaseUrl || !supabaseKey) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Semua halaman di bawah /admin wajib login; jika belum login, alihkan ke /admin/login
  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export default proxy;

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

