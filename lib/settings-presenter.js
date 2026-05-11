/**
 * Builds the Settings view model (grouped fields) for IPC → renderer.
 */

const { config } = require("./config");
const {
  ENV_FIELDS,
  SECTION_TITLES,
  getValueAtPath,
} = require("./config-fields");
const { getEffectiveConfig } = require("./runtime-config");
const userSettings = require("./user-settings");

/**
 * @param {unknown} v
 * @param {'string' | 'int' | 'bool'} type
 */
function toFormValue(v, type) {
  if (type === "bool") return Boolean(v);
  if (type === "int") return Number(v);
  return v == null ? "" : String(v);
}

function getSettingsViewModel() {
  const eff = getEffectiveConfig();
  /** @type {Record<string, { id: string; title: string; fields: object[] }>} */
  const map = {};
  for (const f of ENV_FIELDS) {
    if (!map[f.section]) {
      map[f.section] = {
        id: f.section,
        title: SECTION_TITLES[f.section] || f.section,
        fields: [],
      };
    }
    map[f.section].fields.push({
      envVar: f.envVar,
      label: f.label,
      hint: f.hint ?? "",
      type: f.type,
      value: toFormValue(getValueAtPath(eff, f.path), f.type),
      envBaseline: toFormValue(getValueAtPath(config, f.path), f.type),
      overridden: userSettings.getOverride(f.envVar) !== undefined,
    });
  }
  return {
    ok: true,
    sections: Object.values(map),
    settingsFilePath: userSettings.getSettingsFilePath(),
  };
}

module.exports = { getSettingsViewModel };
