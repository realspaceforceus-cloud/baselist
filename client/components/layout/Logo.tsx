import { Link } from "react-router-dom";

export const Logo = (): JSX.Element => {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 transition hover:opacity-80"
      aria-label="BaseList home"
    >
      <div className="flex h-8 w-8 items-center justify-center text-primary md:h-9 md:w-9">
        <svg
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          className="h-full w-full"
        >
          <path d="M8 256a27 27 0 0 1 43-22L250 353l0-293a21 21 0 0 1 42 0l0 293L461 234a27 27 0 1 1 19 50L309 389l152 105a27 27 0 1 1-34 43L275 432l0 40a21 21 0 0 1-42 0l0-40-152 105a27 27 0 1 1-19-50L203 389 27 494a27 27 0 0 1-19-50L160 339 8 256Z" />
        </svg>
      </div>
      <span className="text-lg font-bold text-foreground">BaseList</span>
    </Link>
  );
};
