import { FormEvent, useState } from "react";
import { ArrowRight, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";

const STEPS = [
  {
    title: "Verify DoD Access",
    description: "Use your .mil email or invite.",
    icon: ShieldCheck,
  },
  {
    title: "Choose Your Base",
    description: "Access your local feed.",
    icon: MapPin,
  },
  {
    title: "Post & Message",
    description: "Buy, sell, or trade securely.",
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
    <div className="divide-y divide-border/60">
      <section className="space-y-6 py-12 text-center md:space-y-7 md:py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Verified Classifieds for Military Bases.
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Built by an Active-Duty Airman for verified DoD members and families.
              Safe, local, and private trading—on base only.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-8">
              <a href="#join" className="flex items-center gap-2">
                Join Now
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8">
              <a href="#how-it-works" className="flex items-center gap-2">
                Learn More
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full px-8"
              type="button"
              onClick={signIn}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="space-y-8 py-12 md:space-y-9 md:py-14">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">How it works</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 text-left shadow-soft"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-14">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-muted/20 p-6 text-center md:p-8">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Secure & Trusted</h2>
            <p className="text-sm text-muted-foreground">
              All data is encrypted end-to-end. No sensitive ID data is stored. BaseList is built by an Active-Duty Airman and trusted across the DoD.
            </p>
          </div>
        </div>
      </section>

      <section id="join" className="flex justify-center py-12 md:py-14">
        <div className="w-full max-w-xl space-y-6 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Join BaseList</h2>
            <p className="text-sm text-muted-foreground">
              Verify once, choose your base, and start trading with trusted teammates.
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
          <button
            type="button"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            onClick={() => toast.info("Invite codes are issued by base moderators.")}
          >
            Have an invite code?
          </button>
          <div className="rounded-2xl border border-dashed border-nav-border bg-background/70 p-4 text-sm text-muted-foreground">
            After verification: choose your base, confirm your profile, and you’re ready. No long signup forms.
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
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
          <span>© 2025 BaseList — Built by Active-Duty Airmen.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
