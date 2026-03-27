/**
 * Twelve-factor style config: strictly from the environment with safe defaults.
 * No config files in the codebase for runtime behaviour.
 */

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function strEnv(name, fallback) {
  const raw = process.env[name];
  return raw !== undefined && raw !== "" ? raw : fallback;
}

const DEFAULT_SHORT_MS = 60_000;
const DEFAULT_LONG_MS = 15 * 60 * 1000;

const config = Object.freeze({
  /** Colima CLI — treat as an attachable backing service (12-factor). */
  colima: Object.freeze({
    bin: strEnv("COLIMA_UI_COLIMA_BIN", "colima"),
    startKubernetes: Object.freeze({
      cpu: strEnv("COLIMA_UI_K8S_CPU", "4"),
      memoryGiB: strEnv("COLIMA_UI_K8S_MEMORY_GIB", "8"),
    }),
  }),
  docker: Object.freeze({
    bin: strEnv("COLIMA_UI_DOCKER_BIN", "docker"),
  }),
  kubernetes: Object.freeze({
    bin: strEnv("COLIMA_UI_KUBECTL_BIN", "kubectl"),
    enabled: strEnv("COLIMA_UI_K8S_ENABLED", "") === "1",
  }),
  timeouts: Object.freeze({
    shortMs: intEnv("COLIMA_UI_TIMEOUT_SHORT_MS", DEFAULT_SHORT_MS),
    longMs: intEnv("COLIMA_UI_TIMEOUT_LONG_MS", DEFAULT_LONG_MS),
  }),
  logging: Object.freeze({
    level: strEnv("COLIMA_UI_LOG_LEVEL", "info"),
  }),
});

module.exports = { config };
