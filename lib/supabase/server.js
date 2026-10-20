import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function getEnv(key) {
  if (process.env[key] && process.env[key].trim()) {
    return process.env[key].trim();
  }

  // Fallback: baca dari .env.local atau .env.lokal jika server belum memuat env baru
  const envFiles = [".env.local", ".env.lokal", ".env"];
  for (const file of envFiles) {
    try {
      const filePath = path.resolve(process.cwd(), file);
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

  return "";
}

export function createServerClient() {
  const rawUrl = getEnv("SUPABASE_URL");
  const rawKey = getEnv("SUPABASE_SECRET_KEY");

  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabaseSecretKey = rawKey;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "SUPABASE_URL atau SUPABASE_SECRET_KEY belum diatur di environment variable. Pastikan file bernama .env.local (dengan huruf 'c') dan restart server 'npm run dev'."
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
