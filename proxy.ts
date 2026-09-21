import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookieSecure } from "@/lib/supabase/cookie-secure";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isPublicPath } from "@/lib/auth/public-paths";
import {
  verifyImpersonateCookieEdge,
  IMPERSONATE_COOKIE_NAME_EDGE,
} from "@/lib/impersonate/cookie-edge";
import { parseTenantUrl, tenantUrl } from "@/lib/navigation/tenant-url";

const COOKIE_NAME = "sb-deskcomm-auth";
const ACTIVE_ORG_COOKIE = "active_org";

type MembershipWithSlug = {
  organization_id: string;
  organizations: { slug: string; status: string } | { slug: string; status: string }[];
};

function organizationOf(row: MembershipWithSlug | null | undefined) {
  const organizations = row?.organizations;
  return Array.isArray(organizations) ? organizations[0] : organizations;
}

function carryResponseState(from: NextResponse, to: NextResponse, requestId: string) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  to.headers.set("x-request-id", requestId);
  return to;
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  // Inject X-Request-Id for downstream correlation (audit log, error wrappers).
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  response.headers.set("x-request-id", requestId);

  const { pathname, search } = request.nextUrl;
  const tenantRoute = parseTenantUrl(pathname);
  // Expose pathname to Server Components via header (used by onboarding layout).
  response.headers.set("x-pathname", pathname);
  request.headers.set("x-pathname", pathname);

  // EPIC-11: the admin surface is reached by PATH (`/admin/*`) — the self-host kit
  // points `NEXT_PUBLIC_ADMIN_URL` at the same host as the app and maps no `admin.`
  // sub-domain. The host-based branch below stays a NOOP today and only exists as
  // documentation of the intended deploy topology.
  const host = request.headers.get("host") ?? "";
  const isAdminSurface = host.startsWith("admin.") || pathname.startsWith("/admin");

  if (isPublicPath(pathname)) {
    return response;
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
      cookieOptions: {
        name: COOKIE_NAME,
        sameSite: "strict",
        httpOnly: true,
        secure: cookieSecure(),
        path: "/",
      },
    },
  );

  // Validate JWT server-side (NEVER use getSession on backend per CLAUDE.md).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // API routes must respond with JSON envelope (contract: {error:{code,message}})
    // — never redirect HTML to JSON consumers. UI routes redirect to /login as before.
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({
          error: {
            code: "unauthenticated",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
          },
        },
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // EPIC-11 S-11.07: vale para a rota interna antiga E para a URL canônica da
  // empresa, antes de qualquer retorno por redirect/rewrite.
  if (pathname.startsWith("/app") || tenantRoute) {
    const impCookie = request.cookies.get(IMPERSONATE_COOKIE_NAME_EDGE)?.value;
    if (impCookie) {
      const result = await verifyImpersonateCookieEdge(
        impCookie,
        env.IMPERSONATE_COOKIE_SECRET ?? "",
      );
      if (!result.valid) {
        console.warn(
          `[middleware] impersonate cookie invalid (${result.reason ?? "unknown"}) — clearing`,
        );
        response.cookies.delete(IMPERSONATE_COOKIE_NAME_EDGE);
      }
    }
  }

  /**
   * A URL pública carrega a EMPRESA; `/app` continua sendo o endereço interno.
   *
   * O slug nunca autoriza nada. Ele só seleciona uma membership que a sessão já
   * pode ler por RLS, grava o mesmo cookie httpOnly usado pelo seletor e reescreve
   * a requisição para a árvore existente. Assim `/residencial-avare/inbox` não
   * duplica dezenas de páginas e não abre uma porta entre organizações.
   */
  if (tenantRoute) {
    const { data: rawMembership } = await supabase
      .from("user_organizations")
      .select("organization_id, organizations!inner(slug, status)")
      .eq("user_id", user.id)
      .eq("organizations.slug", tenantRoute.slug)
      .eq("organizations.status", "active")
      .is("revoked_at", null)
      .not("accepted_at", "is", null)
      .maybeSingle();
    const membership = rawMembership as MembershipWithSlug | null;
    const organization = organizationOf(membership);
    if (!membership || organization?.slug !== tenantRoute.slug) {
      return carryResponseState(
        response,
        NextResponse.redirect(new URL("/403", request.url)),
        requestId,
      );
    }

    request.cookies.set(ACTIVE_ORG_COOKIE, membership.organization_id);
    request.headers.set("x-pathname", tenantRoute.appPath);
    const internalUrl = request.nextUrl.clone();
    internalUrl.pathname = tenantRoute.appPath;
    const rewritten = NextResponse.rewrite(internalUrl, { request: { headers: request.headers } });
    rewritten.cookies.set(ACTIVE_ORG_COOKIE, membership.organization_id, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure(),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return carryResponseState(response, rewritten, requestId);
  }

  // Compatibilidade: favoritos e links internos antigos continuam em `/app/*`,
  // mas a barra do navegador recebe imediatamente a URL canônica com a empresa.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const { data: rawMemberships } = await supabase
      .from("user_organizations")
      .select("organization_id, accepted_at, organizations!inner(slug, status)")
      .eq("user_id", user.id)
      .eq("organizations.status", "active")
      .is("revoked_at", null)
      .not("accepted_at", "is", null)
      .order("accepted_at", { ascending: true, nullsFirst: true })
      .order("organization_id", { ascending: true });
    const memberships = (rawMemberships ?? []) as MembershipWithSlug[];
    const activeId = request.cookies.get(ACTIVE_ORG_COOKIE)?.value;
    const membership = memberships.find((row) => row.organization_id === activeId) ?? memberships[0];
    const slug = organizationOf(membership)?.slug;
    if (slug) {
      const canonical = new URL(tenantUrl(slug, pathname), request.url);
      canonical.search = search;
      return carryResponseState(response, NextResponse.redirect(canonical), requestId);
    }
  }

  // /admin/* additionally requires platform_admin (early gate — authoritative
  // check is server-side in `requirePlatformAdmin`). Skip the RPC for
  // `/admin/forbidden` (rendered to non-admins, would otherwise loop).
  if (isAdminSurface && pathname.startsWith("/admin") && pathname !== "/admin/forbidden") {
    const { data: isAdmin, error } = await supabase.rpc("fn_is_platform_admin");
    if (error || !isAdmin) {
      return NextResponse.redirect(new URL("/admin/forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets / Next internals.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
