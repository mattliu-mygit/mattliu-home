import type { ComponentPropsWithoutRef } from "react";

export function ExternalLink({
  rel,
  target,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      {...props}
      rel={rel ?? "noopener noreferrer"}
      target={target ?? "_blank"}
    />
  );
}
