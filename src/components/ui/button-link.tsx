import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ink";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: ButtonLinkProps) {
  const styles = {
    primary:
      "bg-accent text-accent-foreground shadow-sm hover:opacity-90 focus-visible:outline-cyan",
    secondary:
      "border border-border bg-surface text-dominant-foreground hover:bg-secondary focus-visible:outline-brand",
    outline:
      "border-2 border-accent bg-surface text-accent hover:bg-glow focus-visible:outline-brand",
    ink: "bg-brand text-brand-foreground shadow-sm hover:opacity-90 focus-visible:outline-cyan",
  }[variant];

  const shared =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-center text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2";

  if (href.startsWith("#") || href.startsWith("/")) {
    return (
      <Link className={cn(shared, styles, className)} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <a className={cn(shared, styles, className)} href={href}>
      {children}
    </a>
  );
}
