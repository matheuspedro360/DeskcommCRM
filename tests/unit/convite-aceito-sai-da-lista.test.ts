import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("lista operacional de convites", () => {
  it("não devolve convite que já virou membro", () => {
    const rota = readFileSync("app/api/v1/team/invites/route.ts", "utf8");
    const tabela = rota.indexOf('.from("team_invites")');
    const filtro = rota.indexOf('.is("accepted_at", null)', tabela);
    const resposta = rota.indexOf("return ok(invites", filtro);

    expect(tabela).toBeGreaterThan(-1);
    expect(filtro).toBeGreaterThan(tabela);
    expect(resposta).toBeGreaterThan(filtro);
  });
});
