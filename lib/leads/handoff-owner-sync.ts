import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";

/** Espelha no negócio a atribuição humana já confirmada na conversa. */
export async function atribuirLeadDoHandoff(
  admin: SupabaseClient,
  input: { organizationId: string; leadId: string; userId: string },
): Promise<"atribuido" | "ja_atribuido" | "outro_responsavel" | "indisponivel"> {
  const { data: lead, error } = await admin.from("crm_leads")
    .select("id, contact_id, owner_user_id, owner_agent_id, status")
    .eq("organization_id", input.organizationId).eq("id", input.leadId).maybeSingle();
  if (error || !lead || lead.status !== "open") return "indisponivel";
  if (lead.owner_user_id === input.userId) return "ja_atribuido";
  if (lead.owner_user_id || lead.owner_agent_id) return "outro_responsavel";

  const { data: rows, error: updateError } = await admin.from("crm_leads")
    .update({ owner_user_id: input.userId, owner_kind: "user", assigned_at: new Date().toISOString() })
    .eq("organization_id", input.organizationId).eq("id", input.leadId)
    .is("owner_user_id", null).is("owner_agent_id", null)
    .select("id");
  if (updateError || !rows?.length) return "indisponivel";

  const activity = await emitLeadActivity(admin, {
    organizationId: input.organizationId,
    leadId: input.leadId,
    contactId: lead.contact_id,
    type: "lead_edited",
    sourceModule: "ai",
    sourceId: input.leadId,
    actor: { type: "webhook_source", id: "handoff-owner-sync" },
    reason: "Atribuiu o responsável após passagem da IA",
    payload: { fields: ["owner_user_id"] },
  });
  if (!activity.ok) logger.warn("[handoff-owner-sync] activity failed", { lead_id: input.leadId });
  const { error: eventError } = await admin.rpc("emit_event" as never, {
    p_event_type: "lead.assigned",
    p_entity_kind: "crm_lead",
    p_entity_id: input.leadId,
    p_payload: { lead_id: input.leadId, owner_user_id: input.userId },
    p_metadata: { source: "handoff-owner-sync" },
    p_organization_id: input.organizationId,
  } as never);
  if (eventError) logger.warn("[handoff-owner-sync] event failed", { lead_id: input.leadId });
  return "atribuido";
}
