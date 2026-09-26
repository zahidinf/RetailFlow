"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { getEffectiveUserStatus } from "@/lib/user-status";
import bcrypt from "bcrypt";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: "Invalid email or password" };
  }

  // Check effective user status
  const effectiveStatus = getEffectiveUserStatus(user);
  if (effectiveStatus === "INACTIVE") {
    if (user.inactiveUntil && user.inactiveUntil > new Date()) {
      return {
        error: `Your account is currently inactive until ${user.inactiveUntil.toLocaleDateString("id-ID")}. Please contact the administrator.`,
      };
    }
    return { error: "Your account is currently inactive. Please contact the administrator." };
  }

  await createSession(user.id);

  // Redirect to change password page if first login
  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect("/");
}