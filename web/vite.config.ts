import fs from "node:fs"
import type { IncomingMessage, ServerResponse } from "node:http"
import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// DASHBOARD_DATA_DIR overrides the data folder (handy for testing with other datasets).
const DATA_DIR = path.resolve(process.env.DASHBOARD_DATA_DIR ?? path.resolve(__dirname, "../data"))
const APP_ID = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/

/** Map a request path to a JSON file under ../data, or null if not allowed. */
function resolveDataFile(urlPath: string): string | null {
  let rel: string
  try {
    rel = decodeURIComponent(urlPath.replace(/^\/data\//, ""))
  } catch {
    return null
  }
  if (rel.includes("\0") || rel.includes("\\")) return null
  const parts = rel.split("/")
  const allowed =
    (parts.length === 1 && parts[0] === "apps.json") ||
    (parts.length === 2 && APP_ID.test(parts[0]) && !parts[0].includes("..") && parts[1] === "dashboard_data.json")
  if (!allowed) return null
  const file = path.resolve(DATA_DIR, ...parts)
  return file.startsWith(DATA_DIR + path.sep) ? file : null
}

function serveData(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const urlPath = (req.url ?? "").split("?")[0]
  if (!urlPath.startsWith("/data/")) return next()
  const notFound = () => {
    res.statusCode = 404
    res.setHeader("Content-Type", "text/plain; charset=utf-8")
    res.end("Not found")
  }
  if (req.method !== "GET" && req.method !== "HEAD") return notFound()
  const file = resolveDataFile(urlPath)
  if (!file) return notFound()
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return notFound()
    res.statusCode = 200
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Content-Length", String(stat.size))
    if (req.method === "HEAD") return res.end()
    fs.createReadStream(file).pipe(res)
  })
}

/** Serves ../data/apps.json and ../data/<app_id>/dashboard_data.json in dev and preview. */
function dashboardData(): Plugin {
  return {
    name: "dashboard-data",
    configureServer(server) {
      server.middlewares.use(serveData)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveData)
    },
  }
}

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile(), dashboardData()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 4096,
  },
})
