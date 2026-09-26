"use server";

import { deleteSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { Prisma } from "@prisma/client";

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function updateProfile(
  prevState: { message: string; type: "success" | "error" } | null,
  formData: FormData
): Promise<{ message: string; type: "success" | "error" }> {
  const session = await getSession();

  if (!session) {
    return { message: "Sesi tidak valid", type: "error" };
  }

  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return { message: "First name, last name dan email wajib diisi", type: "error" };
  }

  // Check password update only if provided
  if (password || confirmPassword) {
    if (password !== confirmPassword) {
      return { message: "Konfirmasi password tidak cocok", type: "error" };
    }

    if (password.length < 6) {
      return { message: "Password minimal 6 karakter", type: "error" };
    }
  }

  try {
    const updateData: Prisma.UserUpdateInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    };

    if (password) {
      updateData.password = await hash(password, 10);
    }

    await prisma.user.update({
      where: { id: session.id },
      data: updateData,
    });

    revalidatePath("/profile");
    return { message: "Profil berhasil diperbarui", type: "success" };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { message: "Email sudah digunakan", type: "error" };
    }
    return { message: "Gagal memperbarui profil", type: "error" };
  }
}