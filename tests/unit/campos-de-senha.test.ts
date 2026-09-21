import { describe, expect, it } from "vitest";

import { REQUISITOS_DA_SENHA, requisitosAtendidos, senhaForteSchema } from "@/lib/auth/password-policy";

describe("campos de senha", () => {
  it("exige tamanho, minúscula, maiúscula, número e símbolo em senhas novas", () => {
    expect(REQUISITOS_DA_SENHA).toHaveLength(5);
    expect(requisitosAtendidos("SenhaForte!2026")).toBe(5);
    expect(senhaForteSchema.safeParse("SenhaForte!2026").success).toBe(true);
    expect(senhaForteSchema.safeParse("senhafraca").success).toBe(false);
  });
});
