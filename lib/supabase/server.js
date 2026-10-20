import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

function getEnv(key) {
  if (process.env[key] && process.env[key].trim()) {
    return process.env[key].trim();
  }

  // Fallback hanya saat pengembangan lokal jika server belum sempat memuat ulang .env.local
  if (process.env.NODE_ENV !== "production") {
    const envFiles = [".env.local", ".env.lokal", ".env"];
    for (const file of envFiles) {
      try {
        const filePath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx !== -1) {
              const k = trimmed.slice(0, eqIdx).trim();
              const v = trimmed.slice(eqIdx + 1).trim();
              if (k && v && !process.env[k]) {
                process.env[k] = v;
              }
              if (k === key && v) {
                return v;
              }
            }
          }
        }
      } catch {
        // Abaikan jika tidak bisa dibaca
      }
    }
  }

  return "";
}

// Koneksi server untuk pengunjung (SUPABASE_SECRET_KEY, tanpa sesi)
export function createServerClient() {
  const rawUrl = getEnv("SUPABASE_URL");
  const rawKey = getEnv("SUPABASE_SECRET_KEY");

  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabaseSecretKey = rawKey;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "SUPABASE_URL atau SUPABASE_SECRET_KEY belum diatur di environment variable."
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Koneksi server untuk sesi admin (SUPABASE_PUBLISHABLE_KEY + cookies auth)
export async function createSessionClient() {
  const cookieStore = await cookies();
  const rawUrl = getEnv("SUPABASE_URL");
  const rawKey = getEnv("SUPABASE_PUBLISHABLE_KEY");

  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabasePublishableKey = rawKey;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "SUPABASE_URL atau SUPABASE_PUBLISHABLE_KEY belum diatur di environment variable."
    );
  }

  return createSsrServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Diabaikan jika dipanggil saat komponen sedang render (read-only)
        }
      },
    },
  });
}

export const createAdminClient = createSessionClient;
