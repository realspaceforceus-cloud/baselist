import { Link } from "react-router-dom";

export const Logo = (): JSX.Element => {
  return (
    <Link
      to="/"
      className="flex items-center transition hover:opacity-80 cursor-pointer"
      aria-label="TrustyPCS home"
    >
      <span className="text-2xl font-semibold tracking-tight text-foreground pointer-events-none">
        <span className="font-normal">trusty</span>
        <span className="font-bold">PCS</span>
      </span>
    </Link>
  );
};
