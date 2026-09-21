"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Eye, EyeSlash } from "@/lib/ui/icons";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const [senhaVisivel, setSenhaVisivel] = React.useState(false);
    const ehSenha = type === "password";
    const campo = (
      <input
        type={ehSenha && senhaVisivel ? "text" : type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-border bg-bg px-4 py-2",
          "text-sm text-text placeholder:text-text-muted",
          "transition-[border-color,box-shadow] duration-fast ease-out",
          "hover:border-border-strong",
          "focus-visible:outline-hidden focus-visible:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-soft",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error-bg",
          ehSenha && "pr-11",
          className,
        )}
        ref={ref}
        {...props}
      />
    );

    if (!ehSenha) return campo;

    return (
      <div className="relative">
        {campo}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500"
          onClick={() => setSenhaVisivel((atual) => !atual)}
          aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
          title={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={senhaVisivel}
        >
          {senhaVisivel ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
