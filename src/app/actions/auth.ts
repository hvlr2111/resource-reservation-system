"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }),
  email: z
    .email({ error: "Enter a valid email." })
    .trim()
    .toLowerCase(),
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
});

const loginSchema = z.object({
  email: z
    .email({ error: "Enter a valid email." })
    .trim()
    .toLowerCase(),
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
});

export type AuthFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
} | null;

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // New accounts are always MEMBER — admins are created via seed/DB, not signup.
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "MEMBER" },
    });
    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: ["Email already registered"] } };
    }
    return { message: "Could not create your account. Please try again." };
  }

  redirect("/resources");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  // Same message whether the email is missing or the password is wrong.
  if (!user || !passwordOk) {
    return { errors: { email: ["Invalid email or password"] } };
  }

  await createSession(user.id);
  redirect("/resources");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
