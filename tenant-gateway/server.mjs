import http from "node:http";
import { URL } from "node:url";
import httpProxy from "http-proxy";

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_UPSTREAM_URL = process.env.FRONTEND_UPSTREAM_URL || "http://frontend:5173";
const BACKEND_UPSTREAM_URL = process.env.BACKEND_UPSTREAM_URL || "http://backend:8000";
const TENANT_CONTEXT_HOST = process.env.TENANT_CONTEXT_HOST || "demo.nexus.local";
const TENANT_CONTEXT_PATH = process.env.TENANT_CONTEXT_PATH || "/api/public/tenant-context/";
const TENANT_BOOTSTRAP_GLOBAL = process.env.TENANT_BOOTSTRAP_GLOBAL || "__NEXUS_DATA__";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 5000);

const frontendTarget = new URL(FRONTEND_UPSTREAM_URL);
const backendTarget = new URL(BACKEND_UPSTREAM_URL);

const apiProxy = httpProxy.createProxyServer({
  target: backendTarget.origin,
  xfwd: true,
  changeOrigin: false,
  ws: true,
});

const frontendProxy = httpProxy.createProxyServer({
  target: frontendTarget.origin,
  xfwd: true,
  changeOrigin: false,
  ws: true,
  selfHandleResponse: true,
});

function normalizeHost(hostHeader) {
  if (!hostHeader) return "";
  return hostHeader.split(",")[0].trim().split(":", 1)[0].toLowerCase();
}

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveTenantHost(req) {
  const incomingHost = normalizeHost(req.headers.host);
  if (incomingHost && !isLocalHost(incomingHost)) {
    return incomingHost;
  }
  return TENANT_CONTEXT_HOST;
}

function shouldProxyToBackend(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/") || pathname === "/health/";
}

function sanitizeJsonForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function injectInHead(html, snippet) {
  const marker = "</head>";
  const idx = html.toLowerCase().indexOf(marker);
  if (idx >= 0) {
    return `${html.slice(0, idx)}${snippet}${html.slice(idx)}`;
  }
  return `${snippet}${html}`;
}

function upsertFaviconInHead(html, faviconUrl) {
  if (!faviconUrl) {
    return html;
  }

  const iconTag = `<link rel="icon" type="image/png" href="${faviconUrl}">`;
  const faviconRegex = /<link\b[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*>/i;
  if (faviconRegex.test(html)) {
    return html.replace(faviconRegex, iconTag);
  }
  return injectInHead(html, iconTag);
}

function injectCustomCssInHead(html, customCss) {
  if (!customCss) {
    return html;
  }

  const sanitizedCss = String(customCss).replace(/<\/style/gi, "<\\/style");
  const styleTag = `<style id="tenant-custom-css">${sanitizedCss}</style>`;
  const existingStyleRegex = /<style\b[^>]*id=["']tenant-custom-css["'][^>]*>[\s\S]*?<\/style>/i;
  if (existingStyleRegex.test(html)) {
    return html.replace(existingStyleRegex, styleTag);
  }
  return injectInHead(html, styleTag);
}

async function getTenantContext(tenantHost, cookieHeader) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = {
      Host: tenantHost,
      "X-Forwarded-Host": tenantHost,
      "X-Forwarded-Proto": "http",
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    const response = await fetch(`${backendTarget.origin}${TENANT_CONTEXT_PATH}`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        detail: `tenant-context response status ${response.status}`,
      };
    }

    const payload = await response.json();
    return { ok: true, status: response.status, payload };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "Unknown error while fetching tenant context",
    };
  } finally {
    clearTimeout(timer);
  }
}

function writeProxyResponseHeaders(res, proxyRes, bodyBuffer) {
  const headers = { ...proxyRes.headers };
  delete headers["content-length"];
  headers["content-length"] = String(bodyBuffer.byteLength);
  res.writeHead(proxyRes.statusCode || 200, headers);
}

apiProxy.on("proxyReq", (proxyReq, req) => {
  const tenantHost = resolveTenantHost(req);
  proxyReq.setHeader("Host", tenantHost);
  proxyReq.setHeader("X-Forwarded-Host", tenantHost);
  proxyReq.setHeader("X-Forwarded-Proto", "http");
  if (req.headers.host) {
    proxyReq.setHeader("X-Original-Host", req.headers.host);
  }
});

apiProxy.on("error", (_err, _req, res) => {
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "application/json" });
  }
  if (res) {
    res.end(JSON.stringify({ error: "backend proxy error" }));
  }
});

frontendProxy.on("proxyReq", (proxyReq, req) => {
  proxyReq.setHeader("Accept-Encoding", "identity");
  if (req.headers.host) {
    proxyReq.setHeader("X-Original-Host", req.headers.host);
  }
});

frontendProxy.on("proxyRes", async (proxyRes, req, res) => {
  const contentType = String(proxyRes.headers["content-type"] || "");
  const isHtml = contentType.includes("text/html");

  if (!isHtml || req.method === "HEAD") {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
    return;
  }

  const chunks = [];
  for await (const chunk of proxyRes) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const tenantHost = resolveTenantHost(req);
  const tenantContext = await getTenantContext(tenantHost, req.headers.cookie);
  const branding = tenantContext?.payload?.residence?.branding || {};
  const faviconUrl = branding.favicon_url || "";
  const customCss = branding.custom_css || "";

  const bootstrap = {
    tenantHost,
    tenantContext,
  };

  const bootstrapScript = `<script>window.${TENANT_BOOTSTRAP_GLOBAL}=${sanitizeJsonForInlineScript(bootstrap)};</script>`;
  const originalHtml = Buffer.concat(chunks).toString("utf8");
  let finalHtml = injectInHead(originalHtml, bootstrapScript);
  finalHtml = upsertFaviconInHead(finalHtml, faviconUrl);
  finalHtml = injectCustomCssInHead(finalHtml, customCss);
  const finalBody = Buffer.from(finalHtml, "utf8");

  writeProxyResponseHeaders(res, proxyRes, finalBody);
  res.end(finalBody);
});

frontendProxy.on("error", (_err, _req, res) => {
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
  }
  if (res) {
    res.end("frontend proxy error");
  }
});

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || "/", "http://tenant-gateway.local");
  if (shouldProxyToBackend(parsedUrl.pathname)) {
    apiProxy.web(req, res, { target: backendTarget.origin });
    return;
  }
  frontendProxy.web(req, res, { target: frontendTarget.origin });
});

server.on("upgrade", (req, socket, head) => {
  const parsedUrl = new URL(req.url || "/", "http://tenant-gateway.local");
  if (shouldProxyToBackend(parsedUrl.pathname)) {
    apiProxy.ws(req, socket, head, { target: backendTarget.origin });
    return;
  }
  frontendProxy.ws(req, socket, head, { target: frontendTarget.origin });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[tenant-gateway] listening on :${PORT}`);
  console.log(`[tenant-gateway] frontend upstream: ${frontendTarget.origin}`);
  console.log(`[tenant-gateway] backend upstream: ${backendTarget.origin}`);
  console.log(`[tenant-gateway] tenant fallback host: ${TENANT_CONTEXT_HOST}`);
});
