import { type NextRequest, NextResponse } from "next/server";

/**
 * Compatibilidade com navegadores que ainda procuram o favicon pela rota
 * histórica. A marca é gerada em `/icon`; manter as duas entradas impede que
 * uma atualização de aba transforme o pedido automático em 404.
 */
export function GET(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/icon", request.url), 308);
}

