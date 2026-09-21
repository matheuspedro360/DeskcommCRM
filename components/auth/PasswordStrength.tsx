"use client";

import { Check, X } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { REQUISITOS_DA_SENHA, requisitosAtendidos } from "@/lib/auth/password-policy";

export function PasswordStrength({ password }: { password: string }) {
  const atendidos = requisitosAtendidos(password);
  const completo = atendidos === REQUISITOS_DA_SENHA.length;
  const cor = completo ? "bg-success" : atendidos >= 3 ? "bg-warning" : "bg-error";

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="grid grid-cols-5 gap-1" aria-label={`Força da senha: ${atendidos} de 5`}>
        {REQUISITOS_DA_SENHA.map((requisito, indice) => (
          <span
            key={requisito.id}
            className={cn("h-1.5 rounded-full bg-muted", indice < atendidos && cor)}
          />
        ))}
      </div>
      <ul className="grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        {REQUISITOS_DA_SENHA.map((requisito) => {
          const ok = requisito.confere(password);
          return (
            <li key={requisito.id} className={cn("flex items-center gap-1.5", ok && "text-success")}>
              {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              <span>{requisito.texto}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
