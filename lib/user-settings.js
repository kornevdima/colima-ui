/**
 * Persisted user overrides for COLIMA_UI_*-backed settings (see lib/config-fields.js).
 * Unset keys fall back to lib/config.js (environment at process start).
 */

const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const {
  ENV_FIELDS,
  getValueAtPath,
  coerceFormValue,
  valuesEqualForField,
  ALLOWED_ENV_VARS,
} = require("./config-fields");

const SETTINGS_FILE = "user-settings.json";

/** @type {string | null} */
let userDataDir = null;

/** @type {Record<string, unknown>} */
let overrides = {};

function statePath() {
  return path.join(userDataDir, SETTINGS_FILE);
}

/**
 * @param {Record<string, unknown>} raw
 */
function migrateLegacy(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...raw };
  if (o.kubernetesEnabled !== undefined && o.COLIMA_UI_K8S_ENABLED === undefined) {
    o.COLIMA_UI_K8S_ENABLED = Boolean(o.kubernetesEnabled);
    delete o.kubernetesEnabled;
  }
  if (typeof o.kubernetesServicesNamespace === "string" && o.COLIMA_UI_K8S_SERVICES_NAMESPACE === undefined) {
    o.COLIMA_UI_K8S_SERVICES_NAMESPACE = o.kubernetesServicesNamespace;
    delete o.kubernetesServicesNamespace;
  }
  return o;
}

/**
 * @param {Record<string, unknown>} j
 */
function sanitizeKeys(j) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(j)) {
    if (!ALLOWED_ENV_VARS.has(k)) continue;
    out[k] = j[k];
  }
  return out;
}

function loadFromDisk() {
  overrides = {};
  if (!userDataDir) return;
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    const j = JSON.parse(raw);
    if (j && typeof j === "object" && !Array.isArray(j)) {
      overrides = sanitizeKeys(migrateLegacy(j));
    }
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code !== "ENOENT") {
      /* ignore corrupt */
    }
  }
}

function persist() {
  if (!userDataDir) return;
  const keys = Object.keys(overrides);
  if (keys.length === 0) {
    try {
      fs.unlinkSync(statePath());
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && e.code !== "ENOENT") {
        /* ignore */
      }
    }
    return;
  }
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(overrides, null, 2), "utf8");
}

/**
 * @param {string} dir
 */
function init(dir) {
  userDataDir = dir;
  loadFromDisk();
}

/** @param {string} envVar */
function getOverride(envVar) {
  if (!Object.prototype.hasOwnProperty.call(overrides, envVar)) return undefined;
  return overrides[envVar];
}

/**
 * @param {Record<string, unknown>} values — keys are env var names (from Settings form / IPC)
 */
function saveFromValuesRecord(values) {
  const next = {};
  for (const f of ENV_FIELDS) {
    const raw = values[f.envVar];
    const coerced = coerceFormValue(f, raw);
    const baseline = getValueAtPath(config, f.path);
    if (!valuesEqualForField(f, coerced, baseline)) {
      if (f.type === "bool") next[f.envVar] = Boolean(coerced);
      else if (f.type === "int") next[f.envVar] = Number(coerced);
      else next[f.envVar] = String(coerced);
    }
  }
  overrides = next;
  persist();
}

function clearAll() {
  overrides = {};
  persist();
}

function getSettingsFilePath() {
  return userDataDir ? statePath() : null;
}

module.exports = {
  init,
  getOverride,
  saveFromValuesRecord,
  clearAll,
  getSettingsFilePath,
};
