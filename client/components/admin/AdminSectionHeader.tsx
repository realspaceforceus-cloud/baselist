interface AdminSectionHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
}

export const AdminSectionHeader = ({ title, subtitle, accent }: AdminSectionHeaderProps): JSX.Element => {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {accent ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{accent}</span> : null}
        {subtitle}
      </div>
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
    </header>
  );
};
