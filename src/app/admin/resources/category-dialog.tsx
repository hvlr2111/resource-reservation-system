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
import {
  createCategory,
  type CategoryFormState,
} from "@/app/actions/resources";

export function CategoryDialog() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CategoryFormState>(null);
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await createCategory(null, formData);
      setState(result);
      if (result?.success) {
        toast.success("Category created");
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
        if (nextOpen) setState(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        Add category
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new category</DialogTitle>
          <DialogDescription>
            Create a new resource category.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4" key={open ? "open" : "closed"}>
          <div className="space-y-2">
            <Label htmlFor={id}>Category name</Label>
            <Input
              id={id}
              name="name"
              required
              aria-invalid={Boolean(state?.errors?.name)}
            />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
