import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("convidado autenticado sem vínculo", () => {
  it("é levado ao aceite antes de qualquer página do CRM ser renderizada", () => {
    const fonte = readFileSync("app/app/layout.tsx", "utf8");
    const recuperacao = fonte.indexOf('decisao?.tipo === "convite"');
    const aceite = fonte.indexOf('redirect(`/team/accept-invite/');
    const perfilSemTenant = fonte.indexOf('redirect("/get-started")');
    const shell = fonte.indexOf("const shell = (");

    expect(recuperacao).toBeGreaterThan(-1);
    expect(aceite).toBeGreaterThan(recuperacao);
    expect(perfilSemTenant).toBeGreaterThan(aceite);
    expect(shell).toBeGreaterThan(perfilSemTenant);
  });
});
