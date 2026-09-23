/**
 * Reconcilia cards específicos que já tiveram handoff, mas não mudaram de etapa.
 * Uso: tsx scripts/ops/reconcile-handoff-stage.ts <org> <assignee> <lead> [lead...]
 * Por padrão apenas verifica; passe --apply para gravar via helper com timeline/evento.
 */
import { createAdminClient } from "../../lib/supabase/admin";
import { moverLeadParaEtapaDeHandoff } from "../../lib/leads/handoff-stage-move";

const [organizationId, assigneeId, ...rest] = process.argv.slice(2);
const apply = rest.includes("--apply");
const leadIds = rest.filter((arg) => arg !== "--apply");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!organizationId || !assigneeId || !uuid.test(organizationId) || !uuid.test(assigneeId) || !leadIds.length || leadIds.some((id) => !uuid.test(id))) {
  throw new Error("Informe organização, usuário destinatário e IDs exatos dos cards.");
}

async function main(): Promise<void> {
const admin = createAdminClient();
for (const leadId of leadIds) {
  const { data: lead, error: leadError } = await admin.from("crm_leads")
    .select("id, contact_id, status, pipeline_id, stage_id")
    .eq("organization_id", organizationId).eq("id", leadId).maybeSingle();
  if (leadError) throw leadError;
  if (!lead || lead.status !== "open" || !lead.contact_id) {
    console.log(`${leadId}: ignorado (negócio ausente, fechado ou sem contato)`);
    continue;
  }
  const { data: conversation, error: conversationError } = await admin.from("conversations")
    .select("id, last_handoff_at, last_handoff_reason, assigned_to_user_id")
    .eq("organization_id", organizationId).eq("contact_id", lead.contact_id)
    .eq("assigned_to_user_id", assigneeId)
    .not("last_handoff_at", "is", null)
    .order("last_handoff_at", { ascending: false }).limit(1).maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) {
    console.log(`${leadId}: ignorado (nenhum handoff atribuído ao destinatário)`);
    continue;
  }
  const { data: stage, error: stageError } = await admin.from("crm_stages")
    .select("slug").eq("id", lead.stage_id).eq("pipeline_id", lead.pipeline_id).maybeSingle();
  if (stageError) throw stageError;
  if (!stage || !["leads_novos", "atendimento_ia_sofia"].includes(stage.slug)) {
    console.log(`${leadId}: ignorado (etapa atual não é novo/IA)`);
    continue;
  }
  if (!apply) {
    console.log(`${leadId}: elegível para Aguardando Luiz (simulação)`);
    continue;
  }
  const result = await moverLeadParaEtapaDeHandoff(admin, {
    organizationId,
    leadId,
    reason: "reconciliacao_handoff_ja_registrado",
  });
  console.log(`${leadId}: ${result.motivo}`);
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha na reconciliação");
  process.exitCode = 1;
});
