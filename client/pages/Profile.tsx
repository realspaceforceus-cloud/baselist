import { ShieldCheck } from "lucide-react";

import { useBaseList } from "@/context/BaseListContext";

const Profile = (): JSX.Element => {
  const { user, currentBase } = useBaseList();

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{user.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-verified" aria-hidden />
            <span>{user.verificationStatus}</span>
            <span className="text-border">•</span>
            <span>Member since {new Date(user.memberSince).getFullYear()}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Current base: <span className="font-semibold text-foreground">{currentBase.name}</span>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-dashed border-nav-border bg-background/80 p-6 text-sm text-muted-foreground">
          Stay tuned for saved listings and profile controls.
        </article>
        <article className="rounded-3xl border border-dashed border-nav-border bg-background/80 p-6 text-sm text-muted-foreground">
          Moderation tools, reports, and base settings will appear here when enabled.
        </article>
      </div>
    </section>
  );
};

export default Profile;
