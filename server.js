const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { validateContact } = require("./lib/validator");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.jsonl");
const LOG_FILE = path.join(DATA_DIR, "server-events.log");
const appEvents = new EventEmitter();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SUBMISSIONS_FILE)) fs.writeFileSync(SUBMISSIONS_FILE, "", "utf8");
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "", "utf8");

// Streams: append event records without loading the log file into memory.
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
appEvents.on("request", (record) => {
  logStream.write(`${JSON.stringify(record)}\n`);
});
appEvents.on("submission:accepted", (record) => {
  logStream.write(`${JSON.stringify({ event: "submission:accepted", at: new Date().toISOString(), id: record.id })}\n`);
});
appEvents.on("submission:rejected", (record) => {
  logStream.write(`${JSON.stringify({ event: "submission:rejected", at: new Date().toISOString(), errors: record.errors })}\n`);
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(req, maxBytes = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        req.destroy();
        return;
      }
      body += chunk.toString("utf8");
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const routes = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"]
  };
  const route = routes[pathname];
  if (!route) return false;
  const filePath = path.join(PUBLIC_DIR, route[0]);
  res.writeHead(200, { "Content-Type": route[1], "X-Content-Type-Options": "nosniff" });
  fs.createReadStream(filePath).pipe(res); // Readable stream pipes file to response.
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  appEvents.emit("request", {
    event: "request",
    method: req.method,
    path: pathname,
    at: new Date().toISOString()
  });

  if (req.method === "GET" && serveStatic(req, res, pathname)) return;

  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "SignalDesk", message: "Node.js server is running." });
  }

  if (req.method === "GET" && pathname === "/api/submissions") {
    try {
      const raw = fs.readFileSync(SUBMISSIONS_FILE, "utf8");
      const submissions = raw.split("\n").filter(Boolean).map((line) => JSON.parse(line));
      return sendJson(res, 200, { count: submissions.length, submissions });
    } catch {
      return sendJson(res, 500, { ok: false, message: "Could not read saved submissions." });
    }
  }

  if (req.method === "GET" && pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    // Stream the event log file to the client; do not buffer the whole file.
    const stream = fs.createReadStream(LOG_FILE);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500);
      res.end("Could not stream the event log.");
    });
    stream.pipe(res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/contact") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        ok: false,
        message: error.message || "Could not read request body."
      });
    }

    const validation = validateContact(body);
    if (!validation.valid) {
      appEvents.emit("submission:rejected", { errors: validation.errors });
      return sendJson(res, 422, {
        ok: false,
        message: "Please correct the highlighted fields.",
        errors: validation.errors
      });
    }

    const submission = {
      id: `SD-${Date.now().toString().slice(-8)}`,
      name: validation.cleaned.name,
      email: validation.cleaned.email,
      topic: validation.cleaned.topic,
      message: validation.cleaned.message,
      createdAt: new Date().toISOString()
    };

    try {
      // Append one JSON object per line; this is simple file-based persistence for the lab.
      fs.appendFileSync(SUBMISSIONS_FILE, `${JSON.stringify(submission)}\n`, "utf8");
      appEvents.emit("submission:accepted", submission);
      return sendJson(res, 201, {
        ok: true,
        message: "Your message passed server-side validation and was saved.",
        submission
      });
    } catch {
      return sendJson(res, 500, { ok: false, message: "The server could not save your submission." });
    }
  }

  if (req.method === "GET" || req.method === "POST") {
    return sendJson(res, 404, { ok: false, message: "Route not found." });
  }
  res.setHeader("Allow", "GET, POST");
  return sendJson(res, 405, { ok: false, message: "Method not allowed." });
});

server.listen(PORT, () => {
  console.log(`SignalDesk server running at http://localhost:${PORT}`);
  console.log("Routes: GET /api/health, POST /api/contact, GET /api/submissions, GET /api/events");
});

function shutdown() {
  logStream.end();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
