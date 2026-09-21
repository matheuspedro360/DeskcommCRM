import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("conclusão do cadastro de perfil", () => {
  it("abre a Inbox depois que o perfil é salvo com sucesso", () => {
    const fonte = readFileSync("app/app/settings/profile/_form.tsx", "utf8");
    const sucesso = fonte.indexOf("if (r.ok)");
    const destino = fonte.indexOf('router.replace("/app/inbox")');

    expect(sucesso).toBeGreaterThan(-1);
    expect(destino).toBeGreaterThan(sucesso);
  });
});
