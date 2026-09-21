import { ImageResponse } from "next/og";

/**
 * O favicon é a assinatura da plataforma Decola Aí e permanece igual em todas
 * as organizações atendidas pelo CRM.
 *
 * O desenho reproduz o símbolo oficial de `Ativo 30.svg`. Mantê-lo inline
 * evita acessos externos e permite entregar um PNG compatível com navegadores.
 */
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg viewBox="0 0 150.7 98.19" width="60" height="39" aria-hidden="true">
          <polygon fill="#006837" points="42.51 57.91 60.68 98.19 76.34 65.55 150.7 0 42.51 57.91" />
          <polygon fill="#63b400" points="73.44 63.83 60.54 98.06 85.55 70.28 73.44 63.83" />
          <polygon fill="#92fd25" points="150.7 0 73.31 63.83 112.27 83.97 150.7 0" />
          <polygon fill="#63b400" points="0 55.28 150.7 0 42.91 58.7 0 55.28" />
        </svg>
      </div>
    ),
    {
      ...size,
      headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" },
    },
  );
}
