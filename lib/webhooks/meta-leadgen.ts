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

export type ConsentimentoMeta = {
  granted: boolean;
  field: string;
  rawAnswer: string;
};

const CAMPOS_CONSENTIMENTO = [
  /(^|_)(marketing_)?consent(imento)?($|_)/i,
  /(^|_)(autoriza(cao|ção)|autorizo).*(contato|whatsapp|mensagem)/i,
  /(^|_)(aceite|aceito).*(contato|whatsapp|marketing|privacidade)/i,
  /(^|_)(privacy|politica_de_privacidade|política_de_privacidade)($|_)/i,
];

const RESPOSTAS_POSITIVAS = new Set(["sim", "yes", "aceito", "autorizo", "concordo", "true", "1"]);
const RESPOSTAS_NEGATIVAS = new Set(["nao", "não", "no", "nao autorizo", "não autorizo", "discordo", "false", "0"]);

function normalizarResposta(valor: string): string {
  return valor.trim().toLocaleLowerCase("pt-BR").replace(/[.!]+$/, "");
}

/**
 * Só afirma consentimento quando o próprio formulário traz um campo inequívoco
 * e a resposta também é inequívoca. Campo ausente ou resposta livre/ambígua
 * não vira concessão nem recusa por inferência.
 */
export function extrairConsentimentoMeta(payload: unknown): ConsentimentoMeta | null {
  const parsed = detalheSchema.safeParse(payload);
  if (!parsed.success) return null;
  for (const campo of parsed.data.field_data) {
    if (!CAMPOS_CONSENTIMENTO.some((padrao) => padrao.test(campo.name))) continue;
    const rawAnswer = campo.values.join(", ").trim();
    const resposta = normalizarResposta(rawAnswer);
    if (RESPOSTAS_POSITIVAS.has(resposta)) return { granted: true, field: campo.name, rawAnswer };
    if (RESPOSTAS_NEGATIVAS.has(resposta)) return { granted: false, field: campo.name, rawAnswer };
  }
  return null;
}

export function buildContactConsentMeta(consent: ConsentimentoMeta, formId: string) {
  const momento = new Date().toISOString();
  return {
    marketing: consent.granted
      ? { granted_at: momento, source: "webhook:meta", version: formId }
      : { granted_at: null, declined_at: momento, source: "webhook:meta", version: formId },
    transactional: { granted_at: null, source: null, version: null },
    profiling: { granted_at: null, source: null, version: null },
  };
}

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
