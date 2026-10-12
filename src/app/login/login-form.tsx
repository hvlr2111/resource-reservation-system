"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    null,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in to reserve resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(state?.errors?.email)}
            />
            {state?.errors?.email ? (
              <p className="text-sm text-destructive">{state.errors.email[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              aria-invalid={Boolean(state?.errors?.password)}
            />
            {state?.errors?.password ? (
              <p className="text-sm text-destructive">{state.errors.password[0]}</p>
            ) : null}
          </div>
          {state?.message ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Log in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-foreground underline">
            Register
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
