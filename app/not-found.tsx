import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function NotFound() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-6xl font-bold text-muted-foreground">404</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Back to your dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
