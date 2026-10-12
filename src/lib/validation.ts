import { z } from "zod";

export const uuidSchema = z.string().uuid({ error: "Enter a valid ID." });
export const emailSchema = z
  .email({ error: "Enter a valid email." })
  .trim()
  .toLowerCase();
export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." });
