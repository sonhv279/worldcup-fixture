import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const requestedPort = Number(process.env.PORT || 5173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, normalized === "/" ? "index.html" : normalized);

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

function createServer() {
  return http.createServer(async (request, response) => {
    const filePath = safePath(request.url || "/");

    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    try {
      const info = await stat(filePath);
      const resolvedPath = info.isDirectory() ? path.join(filePath, "index.html") : filePath;
      const extension = path.extname(resolvedPath);

      response.writeHead(200, {
        "content-type": contentTypes[extension] || "application/octet-stream"
      });
      createReadStream(resolvedPath).pipe(response);
    } catch {
      response.writeHead(404, {
        "content-type": "text/plain; charset=utf-8"
      });
      response.end("Not found");
    }
  });
}

function listen(port) {
  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`World Cup 2026 schedule: http://localhost:${port}`);
  });
}

listen(requestedPort);
