"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { copyToClipboard } from "@/lib/clipboard";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye } from "@/lib/ui/icons";
import { usePipelineStages, usePipelines } from "@/hooks/webhooks/useWebhookSources";

type Criada = { id: string; callback_url: string; verify_token: string; page_id: string; form_ids: string[] };

export function CreateMetaLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("Formulários Meta — Decola Aí");
  const [pageId, setPageId] = React.useState("");
  const [formIds, setFormIds] = React.useState("");
  const [pipelineId, setPipelineId] = React.useState("");
  const [stageId, setStageId] = React.useState("");
  const [appSecret, setAppSecret] = React.useState("");
  const [pageToken, setPageToken] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [created, setCreated] = React.useState<Criada | null>(null);
  const pipelines = usePipelines().data?.data ?? [];
  const stages = usePipelineStages(pipelineId || null).data?.data?.stages ?? [];
  const mutation = useMutation({
    mutationFn: (body: unknown) => apiClient.post<{ data: Criada }>("/api/v1/meta-leads/connections", body),
    onError: showApiError,
    onSuccess: (res) => { setCreated(res.data); void qc.invalidateQueries({ queryKey: ["webhook-sources"] }); },
  });

  React.useEffect(() => setStageId(""), [pipelineId]);
  React.useEffect(() => {
    if (!open) {
      setCreated(null); setPageId(""); setFormIds(""); setPipelineId(""); setStageId("");
      setAppSecret(""); setPageToken(""); setShowSecret(false); setShowToken(false);
    }
  }, [open]);

  async function copiar(valor: string) {
    const copiado = await copyToClipboard(valor);
    if (copiado) toast.success("Copiado.");
    else toast.error("Não foi possível copiar.");
  }

  const callbackUrl = created ? `${window.location.origin}${created.callback_url}` : "";

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Conectar formulários da Meta</DialogTitle>
        <DialogDescription>Os leads dos formulários selecionados entrarão diretamente no funil desta empresa. As credenciais ficam cifradas e não voltam a aparecer.</DialogDescription>
      </DialogHeader>
      {created ? <div className="space-y-4">
        <p className="text-sm">Conexão criada. Cadastre estes dois dados no webhook <strong>leadgen</strong> do aplicativo da Meta:</p>
        <div className="space-y-2"><Label>URL de callback</Label><div className="flex gap-2"><Input readOnly value={callbackUrl}/><Button type="button" variant="outline" onClick={() => void copiar(callbackUrl)}>Copiar</Button></div></div>
        <div className="space-y-2"><Label>Token de verificação</Label><div className="flex gap-2"><Input readOnly value={created.verify_token}/><Button type="button" variant="outline" onClick={() => void copiar(created.verify_token)}>Copiar</Button></div></div>
        <p className="text-xs text-muted-foreground">Guarde o token agora. Depois de fechar, ele não será exibido novamente.</p>
        <DialogFooter><Button type="button" onClick={() => onOpenChange(false)}>Concluir</Button></DialogFooter>
      </div> : <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ name, page_id: pageId.trim(), form_ids: formIds.split(/[\s,]+/).map(v => v.trim()).filter(Boolean), pipeline_id: pipelineId, stage_id: stageId, app_secret: appSecret, page_access_token: pageToken });
      }}>
        <div className="space-y-2"><Label htmlFor="meta-name">Nome da conexão</Label><Input id="meta-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="meta-page">ID da Página Decola Aí</Label><Input id="meta-page" inputMode="numeric" value={pageId} onChange={e => setPageId(e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="meta-forms">IDs dos formulários</Label><Input id="meta-forms" value={formIds} onChange={e => setFormIds(e.target.value)} placeholder="Separe por vírgula; vazio aceita todos" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Funil de entrada</Label><Select value={pipelineId} onValueChange={setPipelineId}><SelectTrigger><SelectValue placeholder="Escolha o funil"/></SelectTrigger><SelectContent>{pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Etapa de entrada</Label><Select value={stageId} onValueChange={setStageId} disabled={!pipelineId}><SelectTrigger><SelectValue placeholder="Escolha a etapa"/></SelectTrigger><SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <SecretField id="meta-secret" label="Chave secreta do aplicativo" value={appSecret} setValue={setAppSecret} visible={showSecret} setVisible={setShowSecret}/>
        <SecretField id="meta-token" label="Token de acesso da Página" value={pageToken} setValue={setPageToken} visible={showToken} setVisible={setShowToken}/>
        <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending || !pipelineId || !stageId}>{mutation.isPending ? "Conectando…" : "Criar conexão"}</Button></DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>;
}

function SecretField({ id, label, value, setValue, visible, setVisible }: { id: string; label: string; value: string; setValue: (v: string) => void; visible: boolean; setVisible: (v: boolean) => void }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type={visible ? "text" : "password"} autoComplete="off" value={value} onChange={e => setValue(e.target.value)} className="pr-11" required/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={visible ? "Ocultar" : "Mostrar"} onClick={() => setVisible(!visible)}><Eye className="h-4 w-4"/></Button></div></div>;
}
