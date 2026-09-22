import { ImageResponse } from "next/og";

import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { letraDoIcone } from "@/lib/branding/icone";

export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Ícone da aba do CRM: identifica a empresa ativa sem pôr dados no domínio. */
export default async function IconDaOrganizacao() {
  const user = await loadAuthUser();
  const organization = user ? await resolveActiveOrg(user) : null;
  const initial = letraDoIcone(organization?.name ?? "D") ?? "D";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#506d48",
        color: "#ffffff",
        fontSize: 40,
        fontWeight: 700,
      }}
    >
      {initial}
    </div>,
    { ...size, headers: { "cache-control": "private, max-age=60" } },
  );
}
