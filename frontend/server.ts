import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer, type ViteDevServer } from "vite";

import { fetchTenantContext } from "./src/server/tenant-context";
import { fetchUserContext } from "./src/server/user-context";
import type { AppBootstrapData } from "./src/types/app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (p: string) => path.resolve(__dirname, p);

async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  const port = Number(process.env.PORT || 5173);
  const devDefaultHost = process.env.DEV_DEFAULT_HOST || "demo.nexus.local";
  const internalApiBaseUrl = process.env.INTERNAL_API_BASE_URL || "http://backend:8000";
  let cachedCriticalCss = "";

  let vite: ViteDevServer | undefined;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use("/assets", express.static(resolve("dist/client/assets"), { index: false }));
  }

  function resolveRequestHost(rawHost: string): string {
    const host = rawHost.split(":", 1)[0].toLowerCase();
    if (!isProd && (!host || host === "localhost" || host === "127.0.0.1")) {
      return devDefaultHost;
    }
    return host;
  }

  app.use(["/api/public/*", "/api/auth/*"], express.raw({ type: "*/*", limit: "2mb" }));

  app.all(["/api/public/*", "/api/auth/*"], async (req, res) => {
    try {
      const host = resolveRequestHost((req.headers["x-forwarded-host"] || req.headers.host || "").toString());
      const protocol = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
      const cookieHeader = req.headers.cookie || "";
      const method = req.method.toUpperCase();
      const hasBody = !["GET", "HEAD"].includes(method);
      const requestBody =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
          ? (req.body as unknown as BodyInit)
          : undefined;

      const headers: Record<string, string> = {
        Accept: "application/json",
        Cookie: cookieHeader,
        "X-Forwarded-Host": host,
        "X-Forwarded-Proto": protocol,
      };
      if (req.headers["content-type"]) {
        headers["Content-Type"] = String(req.headers["content-type"]);
      }

      const response = await fetch(`${internalApiBaseUrl}${req.originalUrl}`, {
        method,
        headers,
        body: requestBody,
      });

      const body = await response.text();
      res.status(response.status);
      res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
      const setCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() || [];
      if (setCookie.length > 0) {
        res.setHeader("Set-Cookie", setCookie);
      }
      res.send(body);
    } catch (error) {
      console.error("Error en proxy API publica:", error);
      res.status(502).json({ detail: "Error de proxy interno" });
    }
  });

  app.use("*", async (req, res) => {
    try {
      const requestHost = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
      const host = resolveRequestHost(requestHost);
      const protocol = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();

      const tenantContext = await fetchTenantContext({
        host,
        protocol,
        headers: req.headers,
      });
      const userContext = await fetchUserContext({
        host,
        protocol,
        headers: req.headers,
      });

      const url = req.originalUrl;
      let template: string;
      let render: (url: string, initialData: AppBootstrapData) => Promise<string>;

      if (!isProd && vite) {
        template = await fs.readFile(resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const mod = await vite.ssrLoadModule("/src/entry-server.tsx");
        render = mod.render;
      } else {
        template = await fs.readFile(resolve("dist/client/index.html"), "utf-8");
        const mod = await import("./dist/server/entry-server.js");
        render = mod.render;
      }

      if (!isProd || !cachedCriticalCss) {
        try {
          cachedCriticalCss = await fs.readFile(resolve("src/critical.css"), "utf-8");
        } catch {
          cachedCriticalCss = "";
        }
      }

      const initialDataObj: AppBootstrapData = {
        tenantContext,
        userContext,
        requestHost: host,
        protocol,
      };

      const appHtml = await render(url, initialDataObj);
      const initialData = JSON.stringify(initialDataObj).replace(/</g, "\\u003c");
      const criticalCssTag = cachedCriticalCss
        ? `<style id="__NEXUS_CRITICAL_CSS__">${cachedCriticalCss}</style>`
        : "";
      const appHeadTag = !isProd ? '<link rel="stylesheet" href="/src/styles/index.css" />' : "";

      const html = template
        .replace("<!--app-critical-css-->", criticalCssTag)
        .replace("<!--app-head-->", appHeadTag)
        .replace("<!--app-html-->", appHtml)
        .replace("<!--app-data-->", `<script id="__NEXUS_DATA__" type="application/json">${initialData}</script>`);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(error as Error);
      }
      console.error(error);
      res.status(500).end("Error interno de SSR");
    }
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Frontend SSR escuchando en http://0.0.0.0:${port}`);
  });
}

createApp();
