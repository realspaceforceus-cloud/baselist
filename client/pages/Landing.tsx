import { FormEvent, useState } from "react";
import { MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";

const ICON_STEPS = [
  {
    label: "Verify",
    icon: ShieldCheck,
  },
  {
    label: "Choose Base",
    icon: MapPin,
  },
  {
    label: "Post & Message",
    icon: MessageCircle,
  },
] as const;

const Landing = (): JSX.Element => {
  const { signIn } = useBaseList();
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter a valid email to continue.");
      return;
    }

    toast.success("Verification link sent", {
      description: "Check your inbox to continue joining BaseList.",
    });
    setEmail("");
  };

  return (
    <div className="space-y-16 py-10">
      <section className="px-4">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Verified classifieds for military bases.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Built by an Active-Duty Airman for verified DoD members and families. Safe, local, encrypted, and on-base only.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-foreground/80">
            {ICON_STEPS.map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <a href="#join">Join Now</a>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8"
              type="button"
              onClick={signIn}
            >
              Sign In
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span role="img" aria-hidden>
                🔒
              </span>
              All data encrypted. No IDs stored. Trusted across the DoD.
            </span>
          </p>
        </div>
      </section>

      <section id="join" className="px-4">
        <div className="mx-auto w-full max-w-xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Join BaseList</h2>
            <p className="text-sm text-muted-foreground">
              Verify once with your .mil or approved email.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your .mil or approved email"
                className="h-12 rounded-full"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" size="lg">
              Send verification link
            </Button>
          </form>
          <div className="rounded-2xl border border-dashed border-nav-border bg-background/70 p-4 text-sm text-muted-foreground">
            After verifying, choose your base and start trading. No long forms.
          </div>
        </div>
      </section>

      <footer className="px-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>© 2025 BaseList</span>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Privacy
          </a>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Terms
          </a>
          <span>·</span>
          <a className="hover:text-foreground" href="#">
            Contact
          </a>
          <span>·</span>
          <span>Built by Active-Duty Airmen</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
