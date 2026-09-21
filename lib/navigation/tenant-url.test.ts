import { describe, expect, it } from "vitest";

import { parseTenantUrl, tenantUrl } from "./tenant-url";

describe("URLs por empresa", () => {
  it("monta a empresa antes da página", () => {
    expect(tenantUrl("residencial-avare", "/app/inbox")).toBe(
      "/residencial-avare/inbox",
    );
    expect(tenantUrl("decola-ai-digital-marketing", "/app/settings/tags")).toBe(
      "/decola-ai-digital-marketing/settings/tags",
    );
  });

  it("traduz a URL pública para a rota interna existente", () => {
    expect(parseTenantUrl("/residencial-avare/inbox")).toEqual({
      slug: "residencial-avare",
      appPath: "/app/inbox",
    });
    expect(parseTenantUrl("/residencial-avare/contacts/123")).toEqual({
      slug: "residencial-avare",
      appPath: "/app/contacts/123",
    });
  });

  it("não captura páginas públicas nem caminhos desconhecidos", () => {
    expect(parseTenantUrl("/login")).toBeNull();
    expect(parseTenantUrl("/admin/tenants")).toBeNull();
    expect(parseTenantUrl("/app/inbox")).toBeNull();
    expect(parseTenantUrl("/empresa/pagina-inventada")).toBeNull();
  });
});
