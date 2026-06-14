// Explainer site shell — About → Tools → Tool — with the live Layer-Reveal
// widget embedded on each tool page. Ported from the handoff's site.jsx, using
// path-based client routing (History API) instead of the prototype's hash.
import "@fontsource/space-grotesk/latin-400.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";

import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  matchSitePath,
  nextTool,
  prevTool,
  routeToPath,
  type SiteRoute,
  type ToolId,
  TOOL_IDS,
} from "../lib/route";
import { CK } from "./tokens";
import { TOOLS_INFO } from "./models";
import { LayerReveal } from "./LayerReveal";

type Link = (route: SiteRoute) => {
  href: string;
  onClick: (e: MouseEvent) => void;
};

const GGSQL_URL = "https://ggsql.org";
const GOG_BOOK_URL = "https://link.springer.com/book/10.1007/0-387-28695-0";
const linkStyle = {
  color: CK.ink,
  fontWeight: 600,
  textDecoration: "underline",
  textUnderlineOffset: 2,
} as const;

// ── shared chrome ────────────────────────────────────────────────────────────
function TopBar({
  link,
  trail,
}: {
  link: Link;
  trail: { label: string; to?: SiteRoute }[];
}) {
  return (
    <div style={{ borderBottom: `1px solid ${CK.line}`, background: CK.paper }}>
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Brand returns to the chart builder at `/` (full navigation). */}
        <a
          href="/"
          style={{
            textDecoration: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: CK.disp,
              fontWeight: 700,
              fontSize: 15,
              color: CK.ink,
            }}
          >
            plotr
          </span>
        </a>
        {trail.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span style={{ color: CK.line, fontSize: 13 }}>›</span>
            {c.to ? (
              <a
                {...link(c.to)}
                style={{
                  textDecoration: "none",
                  cursor: "pointer",
                  fontFamily: CK.sans,
                  fontSize: 12.5,
                  color: CK.faint,
                }}
              >
                {c.label}
              </a>
            ) : (
              <span
                style={{
                  fontFamily: CK.disp,
                  fontSize: 15,
                  fontWeight: 700,
                  color: CK.ink,
                }}
              >
                {c.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: CK.mono,
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: CK.faint,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function CTA({
  children,
  primary,
  href,
  onClick,
}: {
  children: ReactNode;
  primary?: boolean;
  href: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 18px",
        borderRadius: 8,
        cursor: "pointer",
        textDecoration: "none",
        fontFamily: CK.sans,
        fontSize: 13.5,
        fontWeight: 600,
        border: primary ? "none" : `1.5px solid ${CK.line}`,
        background: primary ? CK.geom : CK.paper,
        color: primary ? "#fff" : CK.ink2,
        boxShadow: primary ? "0 1px 3px hsl(150 30% 25% / .3)" : "none",
      }}
    >
      {children}
    </a>
  );
}

function Bullets({ items, accent }: { items: string[]; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((t, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                background: accent,
                flexShrink: 0,
                marginTop: 6,
              }}
            />
            <span
              style={{
                fontFamily: CK.sans,
                fontSize: 13.5,
                color: CK.ink2,
                lineHeight: 1.5,
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── About page ────────────────────────────────────────────────────────────────
function AboutPage({ link }: { link: Link }) {
  return (
    <>
      <TopBar link={link} trail={[{ label: "About" }]} />
      <div
        style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 64px" }}
      >
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: 300 }}>
            <Kicker>About plotr</Kicker>
            <h1
              style={{
                fontFamily: CK.disp,
                fontWeight: 700,
                fontSize: 40,
                lineHeight: 1.05,
                letterSpacing: -1,
                margin: "10px 0 18px",
              }}
            >
              A ggsql chart builder
            </h1>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 440,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: CK.sans,
                  fontSize: 15,
                  color: CK.ink2,
                  lineHeight: 1.6,
                }}
              >
                Although charting tools are similar, there's something almost
                magical about the ones based off of{" "}
                <a href={GOG_BOOK_URL} style={linkStyle}>
                  The Grammar of Graphics
                </a>
                .{" "}
              </p>
            </div>

            <div style={{ marginTop: 36, maxWidth: 440 }}>
              <div
                style={{
                  fontFamily: CK.disp,
                  fontSize: 15,
                  fontWeight: 600,
                  color: CK.ink2,
                  marginBottom: 10,
                }}
              >
                How does it work?
              </div>
              <p
                style={{
                  margin: "0 0 18px",
                  fontFamily: CK.sans,
                  fontSize: 13.5,
                  color: CK.faint,
                  lineHeight: 1.6,
                }}
              >
                plotr generates{" "}
                <a href={GGSQL_URL} rel="noreferrer" style={linkStyle}>
                  ggsql
                </a>{" "}
                code which in turn generates a chart. But it's hard to learn new
                terms and concepts. That's where plotr comes in. It guides you
                through the terms and concepts.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 7,
                  maxWidth: 360,
                }}
              >
                {["Variables", "ggsql", "Chart"].map((s, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    {i > 0 && (
                      <span
                        style={{
                          alignSelf: "center",
                          color: CK.faint,
                          fontSize: 13,
                        }}
                      >
                        →
                      </span>
                    )}
                    <div
                      style={{
                        flex: 1,
                        border: `1px solid ${CK.line}`,
                        borderRadius: 5,
                        background: CK.paper,
                        padding: "8px 6px",
                        textAlign: "center",
                        fontFamily: CK.mono,
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: CK.faint,
                      }}
                    >
                      {s}
                    </div>
                  </span>
                ))}
              </div>
              <p
                style={{
                  margin: "30px 0 0px 0px",
                  fontFamily: CK.sans,
                  fontSize: 13.5,
                  color: CK.faint,
                  lineHeight: 1.6,
                }}
              >
                Play with a ready made example to see how it all fits together:
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                {/* opens the real chart builder pre-loaded with a demo-dataset chart
                    (origin-relative #s= hash; full navigation so App hydrates it) */}
                <CTA
                  primary
                  href="/#s=H4sIAAAAAAAAE42PwU4DMQxE_2W4WqiqAFW-IXGDP0CoCo27jZpNQpxF3a7y7ygtixZxwTePnz2eCZ_gNeEF_DrBgRG9DfFhAMGCYYYSQejBE05gvDvvt1YSCGNrox23vVEFYe-8B0OT7JwoKkHbVgSvbjeEM_ieEBRc8iC10tXueHew68352077GMvhX4bz_SMYN6tLodY3QgGj6_TDc5LQDS605x5n1JtRMuhX1Ep4mue9ScmFDgTTiGR2royNeG7EHI6hJV8xp94Eu1QuL3sJYIShl-x2s9hyLMW9dylJ_gv_pFyqKqelzSgmL-a1fgFzBIVczAEAAA"
                >
                  Play with an example
                </CTA>
              </div>
            </div>
          </div>

          {/* Learn about layers — to the right of the main paragraph */}
          <div
            style={{
              flex: "1 1 300px",
              minWidth: 280,
              maxWidth: 420,
              borderLeft: `1px solid ${CK.line}`,
              paddingLeft: 28,
              paddingTop: 42,
            }}
          >
            <div
              style={{
                fontFamily: CK.disp,
                fontSize: 17,
                fontWeight: 600,
                color: CK.ink,
                marginBottom: 6,
              }}
            >
              Learn about layers
            </div>
            <p
              style={{
                margin: "0 0 18px",
                fontFamily: CK.sans,
                fontSize: 13.5,
                color: CK.ink2,
                lineHeight: 1.55,
              }}
            >
              Every chart is built from composable layers. This idea comes from{" "}
              <a href={GOG_BOOK_URL} rel="noreferrer" style={linkStyle}>
                The Grammar of Graphics
              </a>
              . Explore how each tool implements it:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TOOL_IDS.map((id) => {
                const t = TOOLS_INFO[id];
                return (
                  <a
                    key={id}
                    {...link({ kind: "tool", tool: id })}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      border: `1px solid ${CK.line}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      background: CK.paper,
                      transition: "background-color .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = CK.raised)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = CK.paper)
                    }
                  >
                    <div
                      style={{
                        fontFamily: CK.disp,
                        fontSize: 15.5,
                        fontWeight: 600,
                        color: CK.geom,
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontFamily: CK.sans,
                        fontSize: 12.5,
                        color: CK.ink2,
                        lineHeight: 1.45,
                      }}
                    >
                      {t.blurb}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* external links — moved here from the builder's ⋮ menu */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 22,
            borderTop: `1px solid ${CK.line}`,
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <ExtLink
            href="https://github.com/arturcarvalho/plotr"
            icon={<GitHubMark />}
          >
            plotr on GitHub
          </ExtLink>
          <ExtLink href="https://ggsql.org" icon={<GlobeMark />}>
            ggsql.org
          </ExtLink>
        </div>
      </div>
    </>
  );
}

function ExtLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        textDecoration: "none",
        fontFamily: CK.sans,
        fontSize: 13.5,
        fontWeight: 500,
        color: CK.ink2,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = CK.ink)}
      onMouseLeave={(e) => (e.currentTarget.style.color = CK.ink2)}
    >
      <span style={{ color: CK.faint, display: "inline-flex" }}>{icon}</span>
      <span>{children}</span>
      <ExtArrow />
    </a>
  );
}

function GitHubMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GlobeMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function ExtArrow() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.55 }}
      aria-hidden
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

// ── Tool page (live widget embedded) ────────────────────────────────────────────
function ToolPage({ link, tool }: { link: Link; tool: ToolId }) {
  const t = TOOLS_INFO[tool];
  const prev = prevTool(tool);
  const next = nextTool(tool);
  return (
    <>
      <TopBar
        link={link}
        trail={[{ label: "About", to: { kind: "about" } }, { label: t.name }]}
      />
      <div
        style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px 64px" }}
      >
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 0,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <p
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              fontFamily: CK.sans,
              fontSize: 15,
              color: CK.ink2,
              lineHeight: 1.6,
            }}
          >
            {t.intro}
          </p>
          <Bullets items={t.strengths} accent={CK.geom} />
        </div>

        <div style={{ marginTop: 16 }}>
          <LayerReveal
            key={tool}
            models={[t.model]}
            storageKey={"site-" + tool}
            hideHeader
            hideModelSwitch
            hideFoot
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            paddingTop: 14,
            borderTop: `1px solid ${CK.line}`,
          }}
        >
          {prev ? (
            <CTA {...link({ kind: "tool", tool: prev })}>
              ← Previous: {TOOLS_INFO[prev].name}
            </CTA>
          ) : (
            <span />
          )}
          {next ? (
            <CTA {...link({ kind: "tool", tool: next })}>
              Next: {TOOLS_INFO[next].name} →
            </CTA>
          ) : (
            <span />
          )}
        </div>
      </div>
    </>
  );
}

// ── Router shell ────────────────────────────────────────────────────────────────
export function Site({ initial }: { initial: SiteRoute }) {
  const [route, setRoute] = useState<SiteRoute>(initial);

  const go = useCallback((next: SiteRoute) => {
    const path = routeToPath(next);
    if (window.location.pathname !== path)
      window.history.pushState(null, "", path);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  const link: Link = useCallback(
    (next: SiteRoute) => ({
      href: routeToPath(next),
      onClick: (e: MouseEvent) => {
        // Let the browser handle modified clicks (new tab / window) and the
        // builder link; otherwise navigate in-place.
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          (e as MouseEvent & { button: number }).button === 1
        )
          return;
        e.preventDefault();
        go(next);
      },
    }),
    [go],
  );

  useEffect(() => {
    const onPop = () =>
      setRoute(matchSitePath(window.location.pathname) ?? { kind: "about" });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div
      style={{ minHeight: "100vh", background: CK.page, fontFamily: CK.sans }}
    >
      {route.kind === "about" && <AboutPage link={link} />}
      {route.kind === "tool" && <ToolPage link={link} tool={route.tool} />}
    </div>
  );
}
