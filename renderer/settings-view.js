import { escapeHtml } from "./utils.js";

/**
 * @param {string} envVar
 */
function fieldName(envVar) {
  return `settings-env-${envVar.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/**
 * @param {typeof window.colimaUi} api
 */
export async function loadSettingsIntoView(api) {
  const root = document.getElementById("settings-sections-root");
  const pathEl = document.getElementById("settings-persist-path");
  if (!root || !api?.settingsGet) {
    if (root) root.innerHTML = "";
    return;
  }
  let data;
  try {
    data = await api.settingsGet();
  } catch {
    root.innerHTML = '<p class="field-hint">Could not load settings.</p>';
    return;
  }
  if (!data?.ok || !Array.isArray(data.sections)) {
    root.innerHTML = '<p class="field-hint">Could not load settings.</p>';
    return;
  }
  if (pathEl) {
    pathEl.textContent = data.settingsFilePath
      ? `Preferences file: ${data.settingsFilePath}`
      : "";
  }
  root.innerHTML = "";
  for (const sec of data.sections) {
    const fs = document.createElement("fieldset");
    fs.className = "settings-fieldset";
    const leg = document.createElement("legend");
    leg.className = "settings-legend";
    leg.textContent = String(sec.title || sec.id || "—");
    fs.appendChild(leg);
    for (const f of sec.fields || []) {
      const row = document.createElement("div");
      row.className = "settings-field-row field-stacked field-stacked--spaced";
      const name = fieldName(f.envVar);
      const hint = f.hint ? `<p class="field-hint">${escapeHtml(f.hint)}</p>` : "";
      const envLine = `<code class="settings-env-code">${escapeHtml(f.envVar)}</code>`;
      const baseLine = `<span class="settings-baseline">Env at launch: ${escapeHtml(
        formatBaseline(f.type, f.envBaseline)
      )}</span>${f.overridden ? ' · <span class="settings-override-tag">overridden</span>' : ""}`;
      if (f.type === "bool") {
        const checked = f.value ? " checked" : "";
        row.innerHTML = `<label class="label-row settings-bool-label">
            <input type="checkbox" name="${escapeHtml(name)}" id="${escapeHtml(
          name
        )}" data-settings-env-var="${escapeHtml(f.envVar)}"${checked} />
            <span>${escapeHtml(f.label)}</span>
          </label>
          <p class="field-hint">${envLine} · ${baseLine}</p>${hint}`;
      } else if (f.type === "int") {
        row.innerHTML = `<label class="label" for="${escapeHtml(name)}">${escapeHtml(f.label)}</label>
          <input type="number" class="input-text settings-input-narrow" id="${escapeHtml(
            name
          )}" data-settings-env-var="${escapeHtml(
          f.envVar
        )}" step="1" value="${escapeHtml(String(f.value))}" />
          <p class="field-hint">${envLine} · ${baseLine}</p>${hint}`;
      } else {
        row.innerHTML = `<label class="label" for="${escapeHtml(name)}">${escapeHtml(f.label)}</label>
          <input type="text" class="input-text" id="${escapeHtml(
            name
          )}" data-settings-env-var="${escapeHtml(
          f.envVar
        )}" value="${escapeHtml(String(f.value ?? ""))}" spellcheck="false" autocomplete="off" />
          <p class="field-hint">${envLine} · ${baseLine}</p>${hint}`;
      }
      fs.appendChild(row);
    }
    root.appendChild(fs);
  }
}

/**
 * @param {string} type
 * @param {unknown} v
 */
function formatBaseline(type, v) {
  if (type === "bool") return v ? "on" : "off";
  if (v === "" || v === undefined || v === null) return "(empty)";
  return String(v);
}

/**
 * @param {typeof window.colimaUi} api
 */
function collectValuesFromForm() {
  /** @type {Record<string, unknown>} */
  const values = {};
  document.querySelectorAll("[data-settings-env-var]").forEach((el) => {
    const k = el.getAttribute("data-settings-env-var");
    if (!k) return;
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") values[k] = el.checked;
      else if (el.type === "number") {
        if (el.value.trim() === "") values[k] = "";
        else {
          const n = el.valueAsNumber;
          values[k] = Number.isFinite(n) ? n : el.value;
        }
      } else values[k] = el.value;
    }
  });
  return values;
}

/**
 * @param {{
 *   api: typeof window.colimaUi;
 *   refresh: () => Promise<void>;
 *   colimaRuntimeRoot: HTMLElement;
 *   applyColimaDefaults: (root: HTMLElement, d: unknown) => void;
 *   setStatus: (msg: string, isError?: boolean) => void;
 * }} opts
 */
export function wireSettingsView(opts) {
  const { api, refresh, colimaRuntimeRoot, applyColimaDefaults, setStatus } = opts;
  const saveBtn = document.getElementById("settings-save-main");
  const resetBtn = document.getElementById("settings-reset-defaults");

  saveBtn?.addEventListener("click", async () => {
    if (!api?.settingsSet) return;
    try {
      const r = await api.settingsSet({ values: collectValuesFromForm() });
      if (!r?.ok) {
        setStatus(r?.error || "Save failed", true);
        return;
      }
      setStatus("Settings saved.", false);
      await loadSettingsIntoView(api);
      await refresh();
      if (api.colimaUiDefaults) {
        try {
          const d = await api.colimaUiDefaults();
          applyColimaDefaults(colimaRuntimeRoot, d);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setStatus("Save failed.", true);
    }
  });

  resetBtn?.addEventListener("click", async () => {
    if (!api?.settingsReset || !api.settingsGet) return;
    try {
      await api.settingsReset();
      setStatus("Reset to environment defaults. Save is not required.", false);
      await loadSettingsIntoView(api);
      await refresh();
      if (api.colimaUiDefaults) {
        try {
          const d = await api.colimaUiDefaults();
          applyColimaDefaults(colimaRuntimeRoot, d);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setStatus("Reset failed.", true);
    }
  });
}
