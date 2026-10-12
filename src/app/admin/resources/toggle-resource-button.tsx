"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  toggleResourceActive,
  type ToggleResourceState,
} from "@/app/actions/resources";

interface ToggleResourceButtonProps {
  resource: {
    id: string;
    isActive: boolean;
  };
}

export function ToggleResourceButton({ resource }: ToggleResourceButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ToggleResourceState, FormData>(
    toggleResourceActive,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Status updated");
      router.refresh();
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={resource.id} />
      <Button
        type="submit"
        variant={resource.isActive ? "outline" : "default"}
        size="sm"
        disabled={pending}
      >
        {pending
          ? "Updating..."
          : resource.isActive
            ? "Deactivate"
            : "Activate"}
      </Button>
    </form>
  );
}
