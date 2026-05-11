/**
 * Effective config: environment baseline (`lib/config.js`) merged with persisted user overrides.
 */

const { config } = require("./config");
const userSettings = require("./user-settings");
const { ENV_FIELDS, setValueAtPath, coerceStoredValue } = require("./config-fields");

/**
 * @returns {Record<string, unknown>}
 */
function structuralClone() {
  return {
    colima: {
      bin: config.colima.bin,
      startDefaults: { ...config.colima.startDefaults },
      startKubernetes: { ...config.colima.startKubernetes },
      templateEditor: config.colima.templateEditor,
    },
    docker: { bin: config.docker.bin },
    kubernetes: {
      bin: config.kubernetes.bin,
      enabled: config.kubernetes.enabled,
      servicesNamespace: config.kubernetes.servicesNamespace,
    },
    timeouts: { ...config.timeouts },
    logging: { ...config.logging },
    ui: { terminalLinux: config.ui.terminalLinux },
  };
}

/**
 * @returns {typeof config extends infer T ? T : never}
 */
function getEffectiveConfig() {
  const c = structuralClone();
  for (const f of ENV_FIELDS) {
    const o = userSettings.getOverride(f.envVar);
    if (o !== undefined) {
      setValueAtPath(c, f.path, coerceStoredValue(f, o));
    }
  }
  return /** @type {any} */ (c);
}

module.exports = { getEffectiveConfig };
