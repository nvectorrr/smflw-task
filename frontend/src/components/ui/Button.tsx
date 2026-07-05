import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
};

export function Button({ variant = "default", className, ...rest }: ButtonProps) {
  const cls = ["btn", variant !== "default" && `btn--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...rest} />;
}
