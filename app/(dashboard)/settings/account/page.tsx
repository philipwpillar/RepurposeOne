import { DeleteAccountForm } from "./_components/DeleteAccountForm";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted-foreground">
          Manage your Voiceora account and data.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div>
          <h2 className="text-lg font-semibold text-destructive">
            Delete account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently deletes your Voiceora account, brand voices,
            library, and Moment Bundle data. Active subscriptions are cancelled
            immediately. Stripe may retain payment records required by law.
            This cannot be undone.
          </p>
        </div>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
