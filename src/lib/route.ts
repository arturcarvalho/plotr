// Path-based route decisions. The chart builder lives at `/`; the explainer
// site (About / Tools / Tool) is rendered as its own top-level branch in
// main.tsx. Everything here is pure so it can be unit-tested without a DOM.

export type ToolId = "ggplot2" | "ggsql" | "plotr";

// Display + cycle order on the explainer site (Tools listing and Next-tool nav).
export const TOOL_IDS: readonly ToolId[] = ["plotr", "ggsql", "ggplot2"];

export type SiteRoute =
  | { kind: "about" }
  | { kind: "tool"; tool: ToolId };

const isToolId = (s: string): s is ToolId =>
  (TOOL_IDS as readonly string[]).includes(s);

// Resolve a pathname to an explainer-site route, or null when the path belongs
// to the builder. Tolerates a single trailing slash; case-sensitive. `/tool`
// and unknown tool ids fall back to About (still a site path), mirroring the
// handoff's "unknown → About" behaviour.
export function matchSitePath(pathname: string): SiteRoute | null {
  const p = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (p === "/about") return { kind: "about" };
  if (p === "/tools") return { kind: "about" }; // Tools merged into About
  if (p === "/tool") return { kind: "about" };
  if (p.startsWith("/tool/")) {
    const tool = p.slice("/tool/".length);
    return isToolId(tool) ? { kind: "tool", tool } : { kind: "about" };
  }
  return null;
}

// The canonical path for a route — the inverse of matchSitePath, used by the
// in-site router to push history entries.
export function routeToPath(route: SiteRoute): string {
  switch (route.kind) {
    case "tool":
      return `/tool/${route.tool}`;
    case "about":
      return "/about";
  }
}
