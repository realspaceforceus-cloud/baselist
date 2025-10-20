import { Link } from "react-router-dom";

export const Logo = (): JSX.Element => {
  return (
    <Link
      to="/"
      className="flex items-center transition hover:opacity-80"
      aria-label="TrustyPCS home"
    >
      <span className="text-2xl font-semibold tracking-tight text-foreground">
        <span className="font-normal">Trusty</span>
        <span className="font-bold">PCS</span>
      </span>
    </Link>
  );
};
