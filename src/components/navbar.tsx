import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-background">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href={user ? "/resources" : "/login"} className="font-semibold">
          Resource Reservations
        </Link>

        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/resources" className="hover:underline">
              Resources
            </Link>
            <Link href="/reservations" className="hover:underline">
              My Reservations
            </Link>
            {user.role === "ADMIN" ? (
              <>
                <Link href="/admin/resources" className="hover:underline">
                  Admin
                </Link>
                <Link href="/admin/reservations" className="hover:underline">
                  All Reservations
                </Link>
              </>
            ) : null}
            <span className="text-muted-foreground">{user.name}</span>
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
