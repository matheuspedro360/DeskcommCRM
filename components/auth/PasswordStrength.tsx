"use client";

import { Check, X } from "@/lib/ui/icons";
import { requisitosAtendidos, REQUISITOS_DA_SENHA } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/i18n/useT";

export function PasswordStrength({ password }: { password: string }) {
  const t = useT();
  const atendidos = requisitosAtendidos(password);

  return (
    <div className="space-y-1 pt-1" aria-live="polite">
      <p className="text-xs text-text-muted">
        {t("Senha forte:")} {atendidos} {t("de")} {REQUISITOS_DA_SENHA.length} {t("requisitos atendidos")}
      </p>
      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {REQUISITOS_DA_SENHA.map((requisito) => {
          const atende = requisito.confere(password);
          return (
            <li
              key={requisito.id}
              className={cn(
                "flex items-center gap-1.5",
                atende ? "text-success" : "text-text-muted",
              )}
            >
              {atende ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              {t(requisito.texto)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
