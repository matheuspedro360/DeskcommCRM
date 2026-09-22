import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const alteracaoSchema = z.object({
  field: z.literal("leadgen"),
  value: z.object({
    leadgen_id: z.string().min(1),
    page_id: z.string().min(1),
    form_id: z.string().min(1),
    ad_id: z.string().min(1).optional(),
    adgroup_id: z.string().min(1).optional(),
    created_time: z.number().int().optional(),
  }),
});

const notificacaoSchema = z.object({
  object: z.literal("page"),
  entry: z.array(z.object({ id: z.string().min(1), changes: z.array(alteracaoSchema) })).min(1),
});

const detalheSchema = z.object({
  id: z.string().min(1),
  created_time: z.string().optional(),
  field_data: z.array(z.object({ name: z.string().min(1), values: z.array(z.string()) })),
});

export type EventoMetaLeadgen = z.infer<typeof alteracaoSchema>["value"];

export function assinaturaMetaValida(rawBody: string, assinatura: string | null, appSecret: string): boolean {
  if (!assinatura?.startsWith("sha256=") || !appSecret) return false;
  const recebida = Buffer.from(assinatura.slice(7), "hex");
  const esperada = createHmac("sha256", appSecret).update(rawBody).digest();
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada);
}

export function extrairEventosMetaLeadgen(payload: unknown): EventoMetaLeadgen[] {
  const parsed = notificacaoSchema.safeParse(payload);
  if (!parsed.success) return [];
  return parsed.data.entry.flatMap((entrada) =>
    entrada.changes.map((alteracao) => ({ ...alteracao.value, page_id: entrada.id })),
  );
}

export function mapearDetalheDoLeadMeta(payload: unknown): Record<string, string> | null {
  const parsed = detalheSchema.safeParse(payload);
  if (!parsed.success) return null;
  const campos: Record<string, string> = { external_id: parsed.data.id };
  for (const campo of parsed.data.field_data) campos[campo.name] = campo.values.join(", ");
  return campos;
}
