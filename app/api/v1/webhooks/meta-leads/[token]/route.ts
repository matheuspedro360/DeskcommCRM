import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptWebhookSecret } from "@/lib/webhooks/secrets";
import { assinaturaMetaValida, extrairEventosMetaLeadgen, mapearDetalheDoLeadMeta } from "@/lib/webhooks/meta-leadgen";
import { POST as receberWebhookGenerico } from "@/app/api/v1/webhooks/in/[token]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

async function conexao(token: string) {
  return createAdminClient().from("meta_lead_connections")
    .select("id,organization_id,webhook_source_id,page_id,form_ids,app_secret_encrypted,page_access_token_encrypted,is_active,webhook_sources!inner(path_token)")
    .eq("callback_token", token).eq("is_active", true).maybeSingle();
}

export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { token } = await ctx.params;
  const modo = req.nextUrl.searchParams.get("hub.mode");
  const verify = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const { data } = await conexao(token);
  if (!data || modo !== "subscribe" || verify !== token || !challenge) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const { token } = await ctx.params;
  const { data: c, error } = await conexao(token);
  if (error || !c) return fail("not_found", "unknown Meta callback", 404, { requestId });
  const admin = createAdminClient();
  const [appSecret, pageToken] = await Promise.all([
    decryptWebhookSecret(admin, String(c.app_secret_encrypted)),
    decryptWebhookSecret(admin, String(c.page_access_token_encrypted)),
  ]);
  if (!appSecret || !pageToken) return fail("internal_error", "Meta credentials unavailable", 500, { requestId });
  const raw = await req.text();
  if (!assinaturaMetaValida(raw, req.headers.get("x-hub-signature-256"), appSecret)) return fail("forbidden", "invalid Meta signature", 403, { requestId });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return fail("invalid_request", "invalid JSON", 400, { requestId }); }
  const eventos = extrairEventosMetaLeadgen(payload);
  const source = c.webhook_sources as unknown as { path_token: string };
  let aceitos = 0;
  for (const evento of eventos) {
    if (evento.page_id !== c.page_id || (c.form_ids.length && !c.form_ids.includes(evento.form_id))) continue;
    const resposta = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(evento.leadgen_id)}?access_token=${encodeURIComponent(pageToken)}`, { cache: "no-store" });
    const detalhe = mapearDetalheDoLeadMeta(await resposta.json());
    if (!resposta.ok || !detalhe) continue;
    const corpo = { ...detalhe, nome: detalhe.full_name, telefone: detalhe.phone_number, email: detalhe.email, meta_page_id: evento.page_id, meta_form_id: evento.form_id, meta_ad_id: evento.ad_id };
    const interna = new NextRequest(`https://internal/api/v1/webhooks/in/${source.path_token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    const result = await receberWebhookGenerico(interna, { params: Promise.resolve({ token: source.path_token }) });
    if (result.ok) aceitos += 1;
  }
  await admin.from("meta_lead_connections").update({ last_received_at: new Date().toISOString(), last_error: null }).eq("id", c.id).eq("organization_id", c.organization_id);
  return ok({ received: true, accepted: aceitos }, { requestId });
}
