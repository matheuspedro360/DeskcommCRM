import * as React from "react";

import { Eye, EyeSlash } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & { visibilityToggle?: boolean };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, visibilityToggle = true, ...props }, ref) => {
    const [visivel, setVisivel] = React.useState(false);
    const eSenha = type === "password" && visibilityToggle;
    const campo = (
      <input
        {...props}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-border bg-bg px-4 py-2",
          "text-sm text-text placeholder:text-text-muted",
          "transition-[border-color,box-shadow] duration-fast ease-out",
          "hover:border-border-strong",
          "focus-visible:border-accent-500 focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:outline-hidden",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error-bg",
          eSenha && "pr-11",
          className,
        )}
        ref={ref}
      />
    );

    if (!eSenha) return campo;

    return (
      <div className="relative">
        {React.cloneElement(campo, { type: visivel ? "text" : "password" })}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:outline-hidden focus-visible:ring-inset"
          onClick={() => setVisivel((atual) => !atual)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          title={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
