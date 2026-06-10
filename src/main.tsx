import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Site } from "./site/Site.tsx";
import { matchSitePath } from "./lib/route.ts";

// The chart builder lives at `/`; the explainer site (About / Tools / Tool) is
// its own top-level branch so none of the builder's state machine runs there.
const siteRoute = matchSitePath(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{siteRoute ? <Site initial={siteRoute} /> : <App />}</StrictMode>,
);
