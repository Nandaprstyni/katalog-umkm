"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";

export async function loginAdmin(prevStateOrFormData, maybeFormData) {
  const formData = maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData;
  const email = formData?.get("email");
  const password = formData?.get("password");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });

  if (error) {
    let pesan = error.message;
    if (error.message.includes("Invalid login credentials")) {
      pesan = "Email atau password salah. Silakan coba lagi.";
    } else if (error.message.includes("Email not confirmed")) {
      pesan = "Email belum dikonfirmasi di Supabase.";
    }
    return { error: pesan };
  }

  redirect("/admin");
}

export async function keluarAdmin() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function gantiPassword(prevStateOrFormData, maybeFormData) {
  const formData = maybeFormData instanceof FormData ? maybeFormData : prevStateOrFormData;
  const passwordBaru = formData?.get("password_baru");
  const konfirmasiPassword = formData?.get("konfirmasi_password");

  if (!passwordBaru || !konfirmasiPassword) {
    return { error: "Semua kolom password wajib diisi." };
  }

  const strPassword = String(passwordBaru);
  if (strPassword.length < 8) {
    return { error: "Password baru minimal 8 karakter." };
  }

  if (strPassword !== String(konfirmasiPassword)) {
    return { error: "Password baru dan konfirmasi password tidak sama." };
  }

  const supabase = await createSessionClient();

  // Wajib periksa bahwa admin sudah login sebelum mengubah data (Aturan Keamanan #3)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Sesi login telah berakhir atau kamu belum login. Silakan masuk terlebih dahulu.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: strPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Password berhasil diganti." };
}
