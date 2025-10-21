import { Link } from "react-router-dom";

export const Logo = (): JSX.Element => {
  return (
    <Link
      to="/"
      className="flex items-center transition hover:opacity-80 cursor-pointer"
      aria-label="TrustyPCS home"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
      `}</style>
      <span className="flex items-baseline gap-1 pointer-events-none">
        <span
          style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}
          className="text-3xl text-foreground"
        >
          trusty
        </span>
        <span className="text-2xl font-bold tracking-tight text-foreground">
          PCS
        </span>
      </span>
    </Link>
  );
};
