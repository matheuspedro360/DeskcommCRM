import { type NextRequest, NextResponse } from "next/server";

/**
 * Compatibilidade com navegadores que ainda procuram o favicon pela rota
 * histórica. O destino é o símbolo oficial fixo da Decola, para que uma
 * atualização de aba nunca transforme o pedido automático em 404.
 */
export function GET(request: NextRequest): NextResponse {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocolo = request.headers.get("x-forwarded-proto") ?? "https";
  const origemPublica = host ? `${protocolo}://${host.split(",")[0]}` : request.nextUrl.origin;
  return NextResponse.redirect(new URL("/decola-ai-symbol.svg", origemPublica), 308);
}
