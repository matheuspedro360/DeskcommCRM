"use client";

import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowSquareOut, Clock, Globe, IdentificationCard } from "@/lib/ui/icons";
import { MOTIVO_DA_RECUSA_LABEL, type MotivoDaRecusa } from "@/lib/webhooks/captacao";
import type { LeadCaptureRow } from "@/hooks/webhooks/useLeadCaptures";
import { DESFECHO_LABEL } from "./CapturasTab";
import { useT } from "@/hooks/i18n/useT";

interface Props {
  captura: LeadCaptureRow | null;
  onOpenChange: (open: boolean) => void;
}

function dataHoraCompleta(iso: string, idioma: string): string {
  return new Date(iso).toLocaleString(idioma, {
    dateStyle: "full",
    timeStyle: "medium",
  });
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1 py-3 first:pt-2 last:pb-2">
      <dt className="[overflow-wrap:anywhere] text-xs font-medium leading-relaxed text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere] text-sm leading-relaxed text-text">{children}</dd>
    </div>
  );
}

function rotuloLegivel(chave: string): string {
  return chave.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function valorLegivel(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "string") return valor.replace(/_/g, " ");
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return JSON.stringify(valor);
}

export function CapturaDetail({ captura, onOpenChange }: Props) {
  const tagDoIdioma = useTagDeIdioma();
  const t = useT();
  if (!captura) return null;
  const campos = Object.entries(captura.fields ?? {}).filter(
    ([chave]) => !["nome_completo", "número_do_whatsapp", "numero_do_whatsapp"].includes(chave),
  );
  const utms = Object.entries(captura.utm ?? {});
  const nome = captura.captured_name ??
    (typeof captura.fields?.nome_completo === "string" ? captura.fields.nome_completo : null);
  const telefone = captura.captured_phone ??
    (typeof captura.fields?.["número_do_whatsapp"] === "string"
      ? captura.fields["número_do_whatsapp"]
      : typeof captura.fields?.numero_do_whatsapp === "string"
        ? captura.fields.numero_do_whatsapp
        : null);
  const motivo = captura.reject_reason
    ? t(MOTIVO_DA_RECUSA_LABEL[captura.reject_reason as MotivoDaRecusa] ?? captura.reject_reason)
    : null;

  return (
    <Sheet open={!!captura} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex min-w-0 flex-wrap items-center gap-2 pr-8">
            <SheetTitle className="min-w-0 [overflow-wrap:anywhere]">
              {nome ?? telefone ?? t("Captação")}
            </SheetTitle>
            <Badge
              variant={
                captura.outcome === "criado"
                  ? "success"
                  : captura.outcome === "recusado"
                    ? "error"
                    : "neutral"
              }
            >
              {t(DESFECHO_LABEL[captura.outcome])}
            </Badge>
          </div>
          <SheetDescription>
            {t("Chegou pela fonte")} <strong className="text-text">{captura.source_name}</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* O motivo da recusa abre o painel: é a razão de a pessoa ter aberto
              esta linha, e enterrá-lo embaixo dos dados devolveria a ela o
              trabalho de adivinhação que a tela veio acabar. */}
          {motivo ? (
            <section className="rounded-sm border border-error-fg/20 bg-error-bg p-3">
              <p className="text-sm text-error-fg">{motivo}</p>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <IdentificationCard className="h-4 w-4 text-accent" /> {t("O que o formulário trouxe")}
            </h3>
            <dl className="divide-y divide-border rounded-sm border border-border px-3 py-1">
              <Linha rotulo={t("Nome")}>{nome ?? "—"}</Linha>
              <Linha rotulo={t("Telefone")}>{telefone ?? "—"}</Linha>
              <Linha rotulo={t("E-mail")}>{captura.captured_email ?? "—"}</Linha>
              {campos.map(([chave, valor]) => (
                <Linha key={chave} rotulo={rotuloLegivel(chave)}>
                  {valorLegivel(valor)}
                </Linha>
              ))}
            </dl>
            {campos.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("Nenhum campo além dos acima.")}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <Clock className="h-4 w-4 text-accent" /> {t("Quando")}
            </h3>
            <p className="text-sm text-text">{dataHoraCompleta(captura.received_at, tagDoIdioma)}</p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <Globe className="h-4 w-4 text-accent" /> {t("De onde veio")}
            </h3>
            <dl className="divide-y divide-border rounded-sm border border-border px-3 py-1">
              <Linha rotulo={t("Página")}>{captura.origin ?? t("não informada")}</Linha>
              <Linha rotulo={t("Endereço IP")}>
                {captura.remote_ip ?? (
                  <span className="text-muted-foreground">
                    {t(
                      "não identificado — sua instalação não está atrás de um proxy que informe a origem",
                    )}
                  </span>
                )}
              </Linha>
              <Linha rotulo={t("Navegador")}>{captura.user_agent ?? "—"}</Linha>
              {utms.map(([chave, valor]) => (
                <Linha key={chave} rotulo={rotuloLegivel(chave)}>
                  {valor}
                </Linha>
              ))}
            </dl>
          </section>

          {captura.lead_id ? (
            <Button asChild variant="secondary">
              <Link href={`/app/leads/${captura.lead_id}`}>
                <ArrowSquareOut /> {t("Ver o lead no funil")}
              </Link>
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
