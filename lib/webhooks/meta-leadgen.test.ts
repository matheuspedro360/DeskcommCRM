import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaMetaValida, extrairEventosMetaLeadgen, mapearDetalheDoLeadMeta } from "./meta-leadgen";

describe("webhook leadgen da Meta", () => {
  it("aceita somente a assinatura sha256 correta", () => {
    const corpo = '{"object":"page"}';
    const segredo = "segredo-do-app";
    const assinatura = `sha256=${createHmac("sha256", segredo).update(corpo).digest("hex")}`;
    expect(assinaturaMetaValida(corpo, assinatura, segredo)).toBe(true);
    expect(assinaturaMetaValida(corpo, `${assinatura.slice(0, -1)}0`, segredo)).toBe(false);
    expect(assinaturaMetaValida(corpo, null, segredo)).toBe(false);
  });

  it("extrai leadgen e ancora a pagina na entry, nao no corpo interno", () => {
    expect(extrairEventosMetaLeadgen({ object: "page", entry: [{ id: "pagina-1", changes: [{ field: "leadgen", value: { leadgen_id: "lead-1", page_id: "forjada", form_id: "form-1" } }] }] })).toEqual([
      { leadgen_id: "lead-1", page_id: "pagina-1", form_id: "form-1" },
    ]);
  });

  it("recusa objeto e evento diferentes", () => {
    expect(extrairEventosMetaLeadgen({ object: "instagram", entry: [] })).toEqual([]);
    expect(extrairEventosMetaLeadgen({ object: "page", entry: [{ id: "p", changes: [{ field: "feed", value: {} }] }] })).toEqual([]);
  });

  it("normaliza field_data preservando perguntas personalizadas", () => {
    expect(mapearDetalheDoLeadMeta({ id: "lead-1", field_data: [
      { name: "full_name", values: ["Maria"] },
      { name: "phone_number", values: ["+5511999999999"] },
      { name: "faixa_de_renda", values: ["5 a 8 mil"] },
    ] })).toEqual({ external_id: "lead-1", full_name: "Maria", phone_number: "+5511999999999", faixa_de_renda: "5 a 8 mil" });
  });
});
