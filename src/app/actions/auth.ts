"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { isPrismaClientError } from "@/lib/prisma-errors";

const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type AuthFormState = ActionState<"name" | "email" | "password">;

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
      select: { id: true },
    });
    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: ["Email already registered"] } };
    }
    if (isPrismaClientError(error)) {
      return { message: "Could not create your account. Please try again." };
    }
    throw error;
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

  let user: { id: string; passwordHash: string } | null;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
  } catch (error) {
    if (isPrismaClientError(error)) {
      return { message: "Could not sign in. Please try again." };
    }
    throw error;
  }
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
  try {
    await requireUser();
  } catch (error) {
    if (isPrismaClientError(error)) {
      throw new Error("Could not verify your account. Please try again.");
    }
    throw error;
  }
  await destroySession();
  redirect("/login");
}
