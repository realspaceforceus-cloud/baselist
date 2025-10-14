import { FormEvent, useState } from "react";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";

const STEPS = [
  {
    title: "Verify DoD Access",
    description: "Use your .mil email or a verified invite.",
    icon: ShieldCheck,
  },
  {
    title: "Choose Your Base",
    description: "Access your local feed instantly.",
    icon: MapPin,
  },
  {
    title: "Post, Browse, and Message",
    description: "Buy, sell, or trade securely with verified members.",
    icon: MessageCircle,
  },
] as const;

const TESTIMONIALS = [
  {
    quote: "Finally, a safe place to trade on base.",
    author: "TSgt, USAF",
  },
  {
    quote: "Everyone is verified — no more guessing who's legit.",
    author: "Capt, USAF",
  },
  {
    quote: "Feels like a unit bulletin board, but better.",
    author: "GS-12, DoD Civ",
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
    <div className="space-y-24">
      <section className="text-center">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Verified Classifieds for Military Bases.
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Built by an Active-Duty Airman for service members, families, and civilians with base access.
              Connect safely. Buy and sell locally. 100% DoD-verified members only.
            </p>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Buy & sell on base — DoD-verified. No scams. No outsiders. Just verified teammates.
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

      <section id="how-it-works" className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fast, verified access to your on-base marketplace.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 text-left shadow-soft"
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

      <section className="rounded-3xl border border-border bg-muted/30 p-8 text-center md:p-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Security first</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>All data is encrypted end-to-end. No sensitive ID data is stored — ever.</p>
            <p>BaseList is built and maintained by an Active-Duty member.</p>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            For DoD personnel and dependents only.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Trusted across the force</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Real feedback from members using BaseList every PCS cycle.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, author }) => (
            <figure
              key={author}
              className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-card p-6 text-left shadow-soft"
            >
              <Quote className="h-6 w-6 text-muted-foreground" aria-hidden />
              <blockquote className="text-sm text-foreground">“{quote}”</blockquote>
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {author}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="join" className="flex justify-center">
        <div className="w-full max-w-xl space-y-6 rounded-3xl border border-border bg-card p-8 shadow-card">
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

      <footer className="space-y-3 text-center text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a className="hover:text-foreground" href="#">
            Privacy
          </a>
          <a className="hover:text-foreground" href="#">
            Terms
          </a>
          <a className="hover:text-foreground" href="#">
            Contact
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2025 BaseList. Built by Active-Duty Airmen.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
