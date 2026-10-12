"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createResource,
  updateResource,
  type ResourceFormState,
} from "@/app/actions/resources";

interface ResourceDialogProps {
  categories: { id: string; name: string }[];
  resource?: {
    id: string;
    name: string;
    categoryId: string;
    description: string | null;
    location: string | null;
    capacity: number | null;
    maxDurationHours: number;
  };
}

export function ResourceDialog({ categories, resource }: ResourceDialogProps) {
  const router = useRouter();
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(resource?.categoryId || "");
  const [state, setState] = useState<ResourceFormState>(null);
  const [pending, startTransition] = useTransition();
  const isEditing = !!resource;
  const selectedCategoryName = categories.find(
    (category) => category.id === categoryId,
  )?.name;

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateResource(null, formData)
        : await createResource(null, formData);
      setState(result);
      if (result?.success) {
        toast.success(isEditing ? "Resource updated" : "Resource created");
        setOpen(false);
        router.refresh();
      } else if (result?.message) {
        toast.error(result.message);
      } else if (result?.errors) {
        toast.error("Please correct the highlighted fields.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setState(null);
          setCategoryId(resource?.categoryId || "");
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        {isEditing ? "Edit" : "Add resource"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit resource" : "Add new resource"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the resource details below."
              : "Fill in the details to create a new resource."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4" key={open ? (isEditing ? resource.id : "new") : "closed"}>
          {isEditing && (
            <input type="hidden" name="id" value={resource.id} />
          )}
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>Name</Label>
            <Input
              id={`${idPrefix}-name`}
              name="name"
              defaultValue={resource?.name}
              required
              aria-invalid={Boolean(state?.errors?.name)}
            />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-category`}>Category</Label>
            <input
              type="hidden"
              name="categoryId"
              value={categoryId}
              required
            />
            <Select
              value={categoryId}
              onValueChange={(value) => setCategoryId(value ?? "")}
            >
              <SelectTrigger id={`${idPrefix}-category`}>
                <SelectValue placeholder="Select a category">
                  {selectedCategoryName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.categoryId && (
              <p className="text-sm text-destructive">
                {state.errors.categoryId[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-description`}>Description</Label>
            <Textarea
              id={`${idPrefix}-description`}
              name="description"
              defaultValue={resource?.description || ""}
              rows={3}
            />
            {state?.errors?.description && (
              <p className="text-sm text-destructive">
                {state.errors.description[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-location`}>Location</Label>
            <Input
              id={`${idPrefix}-location`}
              name="location"
              defaultValue={resource?.location || ""}
            />
            {state?.errors?.location && (
              <p className="text-sm text-destructive">
                {state.errors.location[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-capacity`}>Capacity (optional)</Label>
            <Input
              id={`${idPrefix}-capacity`}
              name="capacity"
              type="number"
              min="1"
              defaultValue={resource?.capacity || ""}
            />
            {state?.errors?.capacity && (
              <p className="text-sm text-destructive">
                {state.errors.capacity[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-max-duration`}>
              Maximum reservation duration (hours)
            </Label>
            <Input
              id={`${idPrefix}-max-duration`}
              name="maxDurationHours"
              type="number"
              min="1"
              max="12"
              step="1"
              required
              defaultValue={resource?.maxDurationHours ?? 4}
              aria-invalid={Boolean(state?.errors?.maxDurationHours)}
            />
            {state?.errors?.maxDurationHours && (
              <p className="text-sm text-destructive">
                {state.errors.maxDurationHours[0]}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
