import { PackageSearch } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export const EmptyState = (): JSX.Element => {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-nav-border bg-background/70 p-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PackageSearch className="h-7 w-7" aria-hidden />
      </span>
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          No listings yet. Be the first to post.
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Verified members can post gear, furniture, and more for fellow families on base. Keep it local, respectful, and on-mission.
        </p>
      </div>
      <Button asChild size="lg" className="rounded-full px-6">
        <Link to="/post">Post a listing</Link>
      </Button>
    </div>
  );
};
