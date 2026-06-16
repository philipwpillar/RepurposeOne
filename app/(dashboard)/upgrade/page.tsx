import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UpgradePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upgrade your plan</h1>
        <p className="text-muted-foreground">
          Stripe checkout coming in the next slice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creator — £19/mo</CardTitle>
          <CardDescription>100 repurposes per month</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full">
            Coming soon
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pro — £39/mo</CardTitle>
          <CardDescription>1,000 repurposes per month</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full">
            Coming soon
          </Button>
        </CardContent>
      </Card>

      <Button asChild variant="ghost">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
