/** Consulta do formulário no provedor, isolada da rota de ingestão. */
export function consultarLeadDaMeta(leadId: string, pageToken: string): Promise<Response> {
  return fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(leadId)}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${pageToken}` },
  });
}
