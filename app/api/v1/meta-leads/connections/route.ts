import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { fail, ok } from "@/lib/api/wrappers";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptWebhookSecret } from "@/lib/webhooks/secrets";
import { audit } from "@/lib/audit";

const entrada = z.object({
  name: z.string().trim().min(2).max(120),
  page_id: z.string().regex(/^\d+$/),
  form_ids: z.array(z.string().regex(/^\d+$/)).max(100).default([]),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  app_secret: z.string().min(16).max(500),
  page_access_token: z.string().min(20).max(2000),
});

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "meta_lead_connections" });
  if (!authz.ok) return authz.response;
  const { data, error } = await createAdminClient().from("meta_lead_connections")
    .select("id,page_id,form_ids,is_active,last_received_at,last_error,created_at,webhook_source_id,webhook_sources!inner(name,default_pipeline_id,default_stage_id)")
    .eq("organization_id", authz.org.orgId).order("created_at", { ascending: false });
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok(data ?? [], { requestId });
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "meta_lead_connections" });
  if (!authz.ok) return authz.response;
  const parsed = entrada.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Dados inválidos.", 400, { requestId, details: parsed.error.flatten() });
  const admin = createAdminClient();
  const { data: stage } = await admin.from("crm_stages").select("id,pipeline_id")
    .eq("id", parsed.data.stage_id).eq("pipeline_id", parsed.data.pipeline_id)
    .eq("organization_id", authz.org.orgId).maybeSingle();
  if (!stage) return fail("validation_failed", "Etapa não pertence ao funil desta empresa.", 422, { requestId });
  const [appSecret, pageToken] = await Promise.all([
    encryptWebhookSecret(admin, parsed.data.app_secret),
    encryptWebhookSecret(admin, parsed.data.page_access_token),
  ]);
  if (!appSecret || !pageToken) return fail("encryption_unavailable", "Não foi possível cifrar as credenciais.", 422, { requestId });
  const pathToken = randomUUID().replaceAll("-", "");
  const { data: source, error: sourceError } = await admin.from("webhook_sources").insert({
    organization_id: authz.org.orgId, name: parsed.data.name, path_token: pathToken,
    default_pipeline_id: parsed.data.pipeline_id, default_stage_id: parsed.data.stage_id,
    field_map: {}, created_by_user_id: authz.user.id,
  }).select("id").single();
  if (sourceError || !source) return fail("internal_error", sourceError?.message ?? "Falha ao criar fonte.", 500, { requestId });
  const { data: connection, error } = await admin.from("meta_lead_connections").insert({
    organization_id: authz.org.orgId, webhook_source_id: source.id,
    page_id: parsed.data.page_id, form_ids: parsed.data.form_ids,
    app_secret_encrypted: appSecret, page_access_token_encrypted: pageToken,
  }).select("id,callback_token,page_id,form_ids").single();
  if (error || !connection) {
    await admin.from("webhook_sources").delete().eq("id", source.id).eq("organization_id", authz.org.orgId);
    return fail(error?.code === "23505" ? "conflict" : "internal_error", error?.code === "23505" ? "Esta Página já está vinculada." : (error?.message ?? "Falha ao conectar."), error?.code === "23505" ? 409 : 500, { requestId });
  }
  await audit({ action: "integration.meta_leads_connected", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "meta_lead_connections", resourceId: connection.id, requestId, metadata: { page_id: parsed.data.page_id, form_count: parsed.data.form_ids.length } });
  return ok({ ...connection, callback_url: `/api/v1/webhooks/meta-leads/${connection.callback_token}`, verify_token: connection.callback_token }, { requestId, status: 201 });
}
