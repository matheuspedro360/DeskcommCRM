const APP_ROOTS = new Set([
  "activities",
  "ads",
  "agenda",
  "ai",
  "analise",
  "audit",
  "calls",
  "comandas",
  "connections",
  "contacts",
  "crm",
  "extensions",
  "faturamento",
  "inbox",
  "integracao-dados",
  "integrations",
  "kanban",
  "leads",
  "lgpd",
  "metrics",
  "pipelines",
  "products",
  "prospecting",
  "radar",
  "settings",
  "tasks",
  "team",
  "templates",
  "webhooks",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "design",
  "email-templates",
  "get-started",
  "legal",
  "login",
  "onboarding",
  "signup",
  "support-ended",
  "team",
  "vitrine-agenda",
]);

export function tenantUrl(slug: string, appPath = "/app/inbox"): string {
  const suffix = appPath === "/app" ? "" : appPath.replace(/^\/app/, "");
  return `/${slug}${suffix || ""}`;
}

export function parseTenantUrl(pathname: string): { slug: string; appPath: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  const [slug, root] = parts;
  if (!slug || !SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) return null;
  if (!root) return { slug, appPath: "/app" };
  if (!APP_ROOTS.has(root)) return null;
  return { slug, appPath: `/app/${parts.slice(1).join("/")}` };
}
