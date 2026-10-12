"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const resourceSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }),
  categoryId: z.string().uuid({ error: "Invalid category." }),
  description: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().nullable(),
  ),
  location: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().nullable(),
  ),
  capacity: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z
      .string()
      .regex(/^\d+$/, { error: "Capacity must be a positive integer." })
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .positive({ error: "Capacity must be a positive integer." })
          .max(2_147_483_647, {
            error: "Capacity is larger than the maximum supported value.",
          }),
      )
      .nullable(),
  ),
  maxDurationHours: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z
      .string()
      .regex(/^\d+$/, { error: "Maximum duration must be a whole number." })
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .min(1, { error: "Maximum duration must be at least 1 hour." })
          .max(12, { error: "Maximum duration cannot exceed 12 hours." }),
      ),
  ),
});

const categorySchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }),
});

const resourceIdSchema = z.string().uuid({ error: "Invalid resource." });

export type ResourceFormState = {
  errors?: {
    name?: string[];
    categoryId?: string[];
    description?: string[];
    location?: string[];
    capacity?: string[];
    maxDurationHours?: string[];
  };
  message?: string;
  success?: boolean;
} | null;

export type CategoryFormState = {
  errors?: {
    name?: string[];
  };
  message?: string;
  success?: boolean;
} | null;

export type ToggleResourceState = {
  success: boolean;
  message?: string;
} | null;

export async function createResource(
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  await requireAdmin();

  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    maxDurationHours: formData.get("maxDurationHours"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const {
    name,
    categoryId,
    description,
    location,
    capacity,
    maxDurationHours,
  } = parsed.data;

  try {
    await prisma.resource.create({
      data: {
        name,
        categoryId,
        description,
        location,
        capacity,
        maxDurationHours,
        isActive: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { errors: { categoryId: ["Category not found"] } };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { message: "Could not create resource. Please try again." };
    }
    throw error;
  }

  return { success: true };
}

export async function updateResource(
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  await requireAdmin();

  const parsedId = resourceIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { message: "A valid resource ID is required." };
  }
  const id = parsedId.data;

  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    maxDurationHours: formData.get("maxDurationHours"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const {
    name,
    categoryId,
    description,
    location,
    capacity,
    maxDurationHours,
  } = parsed.data;

  try {
    await prisma.resource.update({
      where: { id },
      data: {
        name,
        categoryId,
        description,
        location,
        capacity,
        maxDurationHours,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { message: "Resource not found." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { errors: { categoryId: ["Category not found"] } };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { message: "Could not update resource. Please try again." };
    }
    throw error;
  }

  return { success: true };
}

export async function toggleResourceActive(
  _prevState: ToggleResourceState,
  formData: FormData,
): Promise<ToggleResourceState> {
  await requireAdmin();

  const parsedId = resourceIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { success: false, message: "A valid resource ID is required." };
  }
  const id = parsedId.data;

  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!resource) {
      return { success: false, message: "Resource not found." };
    }

    const result = await prisma.resource.updateMany({
      where: { id, isActive: resource.isActive },
      data: { isActive: !resource.isActive },
    });

    if (result.count === 0) {
      return {
        success: false,
        message: "Resource status changed. Refresh the page and try again.",
      };
    }

    return {
      success: true,
      message: resource.isActive
        ? "Resource deactivated"
        : "Resource activated",
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        message: "Could not update the resource status. Please try again.",
      };
    }
    throw error;
  }
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name } = parsed.data;

  try {
    await prisma.resourceCategory.create({
      data: { name },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { name: ["Category name already exists"] } };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { message: "Could not create category. Please try again." };
    }
    throw error;
  }

  return { success: true };
}
