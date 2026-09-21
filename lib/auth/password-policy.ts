import { z } from "zod";

export const REQUISITOS_DA_SENHA = [
  { id: "tamanho", texto: "Pelo menos 8 caracteres", confere: (senha: string) => senha.length >= 8 },
  { id: "minuscula", texto: "Uma letra minúscula", confere: (senha: string) => /[a-z]/.test(senha) },
  { id: "maiuscula", texto: "Uma letra maiúscula", confere: (senha: string) => /[A-Z]/.test(senha) },
  { id: "numero", texto: "Um número", confere: (senha: string) => /\d/.test(senha) },
  { id: "simbolo", texto: "Um símbolo", confere: (senha: string) => /[^A-Za-z0-9]/.test(senha) },
] as const;

export function requisitosAtendidos(senha: string): number {
  return REQUISITOS_DA_SENHA.filter((requisito) => requisito.confere(senha)).length;
}

export const senhaForteSchema = z.string().superRefine((senha, contexto) => {
  if (REQUISITOS_DA_SENHA.every((requisito) => requisito.confere(senha))) return;
  contexto.addIssue({
    code: "custom",
    message: "Use uma senha forte que atenda a todos os requisitos",
  });
});
