import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ActiveNavLink } from "@/components/active-nav-link";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:min-h-14 sm:flex-nowrap sm:py-0">
        <Link href={user ? "/resources" : "/login"} className="font-semibold">
          Resource Reservations
        </Link>

        {user ? (
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-sm sm:gap-x-3">
            <ActiveNavLink href="/resources">
              Resources
            </ActiveNavLink>
            <ActiveNavLink href="/reservations">
              My Reservations
            </ActiveNavLink>
            {user.role === "ADMIN" ? (
              <>
                <ActiveNavLink href="/admin/resources">
                  Admin
                </ActiveNavLink>
                <ActiveNavLink href="/admin/reservations">
                  All Reservations
                </ActiveNavLink>
              </>
            ) : null}
            <span className="hidden text-muted-foreground md:inline">
              {user.name}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                Logout
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="hover:underline">
              Login
            </Link>
            <Link href="/register" className="hover:underline">
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
