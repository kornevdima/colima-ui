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
    /** Defaults for plain `colima start` when the UI (or IPC) passes no overrides. */
    startDefaults: Object.freeze({
      cpu: strEnv("COLIMA_UI_START_CPU", "2"),
      memoryGiB: strEnv("COLIMA_UI_START_MEMORY_GIB", "2"),
      diskGiB: strEnv("COLIMA_UI_START_DISK_GIB", "100"),
      runtime: strEnv("COLIMA_UI_START_RUNTIME", "docker"),
      vmType: strEnv("COLIMA_UI_START_VM_TYPE", "vz"),
    }),
    /** Defaults when starting with Kubernetes preset (`--kubernetes`). */
    startKubernetes: Object.freeze({
      cpu: strEnv("COLIMA_UI_K8S_CPU", "4"),
      memoryGiB: strEnv("COLIMA_UI_K8S_MEMORY_GIB", "8"),
      diskGiB: strEnv("COLIMA_UI_K8S_DISK_GIB", "100"),
      kubernetesVersion: strEnv("COLIMA_UI_K8S_VERSION", ""),
    }),
    /** Binary for `colima template` edit-in-terminal (same as `colima template --editor`). */
    templateEditor: strEnv("COLIMA_UI_TEMPLATE_EDITOR", "vim"),
  }),
  docker: Object.freeze({
    bin: strEnv("COLIMA_UI_DOCKER_BIN", "docker"),
  }),
  kubernetes: Object.freeze({
    bin: strEnv("COLIMA_UI_KUBECTL_BIN", "kubectl"),
    /** Set `COLIMA_UI_K8S_ENABLED=0` to skip all kubectl list calls on refresh. */
    enabled: strEnv("COLIMA_UI_K8S_ENABLED", "1") === "1",
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
