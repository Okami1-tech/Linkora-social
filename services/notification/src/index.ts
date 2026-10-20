// tracing MUST be the very first import so OTel auto-instrumentations are
// registered before express (or any other library) is loaded.
import "./tracing";

import express, { type Application, Request, Response } from "express";
import { trace } from "@opentelemetry/api";
import { pino } from "pino";
import client from "prom-client";

const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  base: { service: "notification" },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env["NODE_ENV"] !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, ignore: "pid,hostname", translateTime: "SYS:standard" },
    },
  }),
});

const app: Application = express();
app.use(express.json());

const tracer = trace.getTracer("notification");

// ── Prometheus Metrics ──────────────────────────────────────────────────────
client.collectDefaultMetrics({ prefix: "notification_" });

export const dispatchTotal = new client.Counter({
  name: "dispatch_total",
  help: "Total number of dispatched notifications",
  labelNames: ["channel", "status"]
});

export const dispatchErrors = new client.Counter({
  name: "dispatch_errors_total",
  help: "Total number of dispatch errors",
  labelNames: ["channel"]
});

export const queueDepth = new client.Gauge({
  name: "queue_depth",
  help: "Current depth of the notification queue"
});

export const channelLatency = new client.Histogram({
  name: "channel_latency_seconds",
  help: "Latency of notification dispatch per channel",
  labelNames: ["channel"],
  buckets: [0.1, 0.5, 1, 2, 5]
});

/** GET /metrics — Prometheus metrics endpoint */
app.get("/metrics", async (_req: Request, res: Response) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
// ────────────────────────────────────────────────────────────────────────────

/** GET /health — liveness probe with a sample manual span */
app.get("/health", (_req: Request, res: Response) => {
  const span = tracer.startSpan("notification.health.check");
  try {
    res.json({ status: "ok", service: "notification" });
  } finally {
    span.end();
  }
});

/** GET /health/ready — readiness probe */
app.get("/health/ready", (_req: Request, res: Response) => {
  res.json({ status: "ready", service: "notification" });
});

const PORT = parseInt(process.env["PORT"] ?? "3002", 10);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, "notification service listening");
});

// Graceful shutdown
function shutdown() {
  logger.info("shutting down notification service");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app };
