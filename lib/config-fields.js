/**
 * Maps each COLIMA_UI_* env-backed setting to its path in the merged config object.
 * Used by runtime config, persisted user overrides, and the Settings UI.
 */

const { config } = require("./config");

/**
 * @typedef {{ envVar: string; path: string[]; type: 'string' | 'int' | 'bool'; section: string; label: string; hint?: string; allowEmpty?: boolean }} EnvField
 */

/** @type {EnvField[]} */
const ENV_FIELDS = [
  {
    envVar: "COLIMA_UI_COLIMA_BIN",
    path: ["colima", "bin"],
    type: "string",
    section: "colima",
    label: "Colima binary",
    hint: "Executable name or path for the Colima CLI.",
  },
  {
    envVar: "COLIMA_UI_START_CPU",
    path: ["colima", "startDefaults", "cpu"],
    type: "string",
    section: "colimaStart",
    label: "Default start · CPU",
  },
  {
    envVar: "COLIMA_UI_START_MEMORY_GIB",
    path: ["colima", "startDefaults", "memoryGiB"],
    type: "string",
    section: "colimaStart",
    label: "Default start · Memory (GiB)",
  },
  {
    envVar: "COLIMA_UI_START_DISK_GIB",
    path: ["colima", "startDefaults", "diskGiB"],
    type: "string",
    section: "colimaStart",
    label: "Default start · Disk (GiB)",
  },
  {
    envVar: "COLIMA_UI_START_RUNTIME",
    path: ["colima", "startDefaults", "runtime"],
    type: "string",
    section: "colimaStart",
    label: "Default start · Runtime",
    hint: "docker, containerd, or incus.",
  },
  {
    envVar: "COLIMA_UI_START_VM_TYPE",
    path: ["colima", "startDefaults", "vmType"],
    type: "string",
    section: "colimaStart",
    label: "Default start · VM type",
    hint: "qemu, vz, or krunkit.",
  },
  {
    envVar: "COLIMA_UI_K8S_CPU",
    path: ["colima", "startKubernetes", "cpu"],
    type: "string",
    section: "colimaK8sStart",
    label: "Kubernetes preset · CPU",
  },
  {
    envVar: "COLIMA_UI_K8S_MEMORY_GIB",
    path: ["colima", "startKubernetes", "memoryGiB"],
    type: "string",
    section: "colimaK8sStart",
    label: "Kubernetes preset · Memory (GiB)",
  },
  {
    envVar: "COLIMA_UI_K8S_DISK_GIB",
    path: ["colima", "startKubernetes", "diskGiB"],
    type: "string",
    section: "colimaK8sStart",
    label: "Kubernetes preset · Disk (GiB)",
  },
  {
    envVar: "COLIMA_UI_K8S_VERSION",
    path: ["colima", "startKubernetes", "kubernetesVersion"],
    type: "string",
    section: "colimaK8sStart",
    label: "Kubernetes preset · version",
    hint: "Optional, e.g. v1.30.0 — passed to colima when set.",
    allowEmpty: true,
  },
  {
    envVar: "COLIMA_UI_TEMPLATE_EDITOR",
    path: ["colima", "templateEditor"],
    type: "string",
    section: "colima",
    label: "Template editor (terminal)",
    hint: "Editor for “edit template in terminal”.",
  },
  {
    envVar: "COLIMA_UI_DOCKER_BIN",
    path: ["docker", "bin"],
    type: "string",
    section: "docker",
    label: "Docker binary",
  },
  {
    envVar: "COLIMA_UI_KUBECTL_BIN",
    path: ["kubernetes", "bin"],
    type: "string",
    section: "kubernetes",
    label: "kubectl binary",
  },
  {
    envVar: "COLIMA_UI_K8S_ENABLED",
    path: ["kubernetes", "enabled"],
    type: "bool",
    section: "kubernetes",
    label: "Run kubectl lists on refresh",
    hint: "Same idea as COLIMA_UI_K8S_ENABLED=1 or 0.",
  },
  {
    envVar: "COLIMA_UI_K8S_SERVICES_NAMESPACE",
    path: ["kubernetes", "servicesNamespace"],
    type: "string",
    section: "kubernetes",
    label: "Services list namespace",
    hint: "Empty string → kubectl get svc -A. Non-empty → kubectl get svc -n <name>.",
    allowEmpty: true,
  },
  {
    envVar: "COLIMA_UI_TIMEOUT_SHORT_MS",
    path: ["timeouts", "shortMs"],
    type: "int",
    section: "timeouts",
    label: "Short timeout (ms)",
    hint: "Read-only CLI calls (docker info, kubectl get, …).",
  },
  {
    envVar: "COLIMA_UI_TIMEOUT_LONG_MS",
    path: ["timeouts", "longMs"],
    type: "int",
    section: "timeouts",
    label: "Long timeout (ms)",
    hint: "colima start / colima stop.",
  },
  {
    envVar: "COLIMA_UI_LOG_LEVEL",
    path: ["logging", "level"],
    type: "string",
    section: "logging",
    label: "Main process log level",
    hint: "error, warn, info, or debug.",
  },
  {
    envVar: "COLIMA_UI_TERMINAL_LINUX",
    path: ["ui", "terminalLinux"],
    type: "string",
    section: "ui",
    label: "Linux terminal command",
    hint: "Optional. If unset at launch, TERMINAL may apply. Used when opening docker/colima in a terminal on Linux.",
    allowEmpty: true,
  },
];

const SECTION_TITLES = {
  colima: "Colima",
  colimaStart: "Colima · default start",
  colimaK8sStart: "Colima · Start + Kubernetes",
  docker: "Docker",
  kubernetes: "Kubernetes",
  timeouts: "Timeouts",
  logging: "Logging",
  ui: "UI / terminal",
};

/** @param {Record<string, unknown>} root @param {string[]} path */
function getValueAtPath(root, path) {
  let o = root;
  for (const p of path) {
    if (o == null || typeof o !== "object") return undefined;
    o = /** @type {Record<string, unknown>} */ (o)[p];
  }
  return o;
}

/** @param {Record<string, unknown>} root @param {string[]} path @param {unknown} val */
function setValueAtPath(root, path, val) {
  let o = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    o = /** @type {Record<string, unknown>} */ (o[k]);
  }
  o[path[path.length - 1]] = val;
}

/** @param {EnvField} f @param {unknown} v */
function coerceStoredValue(f, v) {
  if (f.type === "bool") {
    if (v === true || v === false) return v;
    if (v === "1" || v === 1) return true;
    if (v === "0" || v === 0) return false;
    return Boolean(v);
  }
  if (f.type === "int") {
    const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    return Number.isFinite(n) ? n : getValueAtPath(config, f.path);
  }
  if (f.allowEmpty && (v === "" || (typeof v === "string" && v.trim() === ""))) {
    return f.type === "string" ? String(v).trim() : "";
  }
  return String(v ?? "").trim();
}

/**
 * @param {EnvField} f
 * @param {unknown} raw — from IPC / form
 */
function coerceFormValue(f, raw) {
  if (f.type === "bool") {
    if (raw === undefined || raw === null) return Boolean(getValueAtPath(config, f.path));
    return raw === true || raw === "true" || raw === 1 || raw === "1";
  }
  if (f.type === "int") {
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      return getValueAtPath(config, f.path);
    }
    const n = Number.parseInt(String(raw).trim(), 10);
    return Number.isFinite(n) ? n : getValueAtPath(config, f.path);
  }
  const s = raw == null ? "" : String(raw);
  if (f.allowEmpty) return s.trim();
  const t = s.trim();
  if (!t) return getValueAtPath(config, f.path);
  return t;
}

/**
 * @param {EnvField} f
 * @param {unknown} a
 * @param {unknown} b
 */
function valuesEqualForField(f, a, b) {
  if (f.type === "bool") return Boolean(a) === Boolean(b);
  if (f.type === "int") return Number(a) === Number(b);
  return String(a ?? "") === String(b ?? "");
}

const ALLOWED_ENV_VARS = new Set(ENV_FIELDS.map((x) => x.envVar));

module.exports = {
  ENV_FIELDS,
  SECTION_TITLES,
  getValueAtPath,
  setValueAtPath,
  coerceStoredValue,
  coerceFormValue,
  valuesEqualForField,
  ALLOWED_ENV_VARS,
  baseConfig: config,
};
