import { escapeHtml, formatBytes } from "./utils.js";

/**
 * @param {HTMLElement} root — `#view-colima-runtime`
 * @param {{ startDefaults?: Record<string, string>; startKubernetes?: Record<string, string> }} d
 */
export function applyColimaUiDefaultsToForm(root, d) {
  if (!d?.startDefaults) return;
  const sd = d.startDefaults;
  const sk = d.startKubernetes || {};
  const set = (id, v) => {
    const el = root.querySelector(`#${id}`);
    if (el && "value" in el && v != null && v !== "") el.value = String(v);
  };
  set("colima-start-cpu", sd.cpu);
  set("colima-start-memory", sd.memoryGiB);
  set("colima-start-disk", sd.diskGiB);
  set("colima-start-runtime", sd.runtime);
  set("colima-start-vm-type", sd.vmType);
  set("colima-k8s-version", sk.kubernetesVersion || "");
}

/**
 * @param {HTMLElement} root
 * @returns {Record<string, string>}
 */
export function readColimaStartOptionsFromForm(root) {
  const v = (id) => {
    const el = root.querySelector(`#${id}`);
    return el && "value" in el ? String(el.value).trim() : "";
  };
  const out = {
    cpu: v("colima-start-cpu"),
    memoryGiB: v("colima-start-memory"),
    diskGiB: v("colima-start-disk"),
    runtime: v("colima-start-runtime"),
    vmType: v("colima-start-vm-type"),
    kubernetesVersion: v("colima-k8s-version"),
  };
  return out;
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} instances
 */
export function renderProfilesTable(tbodyEl, instances) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(instances) ? instances : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="7" class="empty">No profiles (<code>colima list -j</code> returned none).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    const name = String(row.name ?? "—");
    const status = String(row.status ?? "—");
    const arch = String(row.arch ?? "—");
    const cpus = row.cpus != null ? String(row.cpus) : "—";
    const mem = typeof row.memory === "number" ? formatBytes(row.memory) : "—";
    const disk = typeof row.disk === "number" ? formatBytes(row.disk) : "—";
    const runtime = String(row.runtime ?? "—");
    tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${escapeHtml(
      status
    )}</td><td>${escapeHtml(arch)}</td><td>${escapeHtml(
      cpus
    )}</td><td>${escapeHtml(mem)}</td><td>${escapeHtml(disk)}</td><td>${escapeHtml(
      runtime
    )}</td>`;
    tbodyEl.appendChild(tr);
  }
}

export function fillProfileSelect(selectEl, instances) {
  const prev = selectEl.value;
  selectEl.innerHTML = "";
  const names = instances.length
    ? instances.map((i) => String(i.name || "default"))
    : ["default"];
  const uniq = [...new Set(names)];
  for (const name of uniq) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  }
  if (uniq.includes(prev)) selectEl.value = prev;
}

export function renderColimaTelemetry(preEl, listRes, statusRes) {
  const payload = {
    list: {
      ok: listRes.ok,
      code: listRes.code,
      stderr: listRes.stderr || undefined,
      instances: listRes.instances,
      parseError: listRes.parseError,
    },
    status: statusRes
      ? {
          ok: statusRes.ok,
          code: statusRes.code,
          stderr: statusRes.stderr || undefined,
          json: statusRes.status,
        }
      : null,
  };
  preEl.textContent = JSON.stringify(payload, null, 2);
}

/**
 * @param {HTMLElement} metaEl
 * @param {HTMLPreElement} yamlPre
 * @param {object | null} templateRes
 */
export function renderColimaTemplate(metaEl, yamlPre, templateRes) {
  if (!templateRes) {
    metaEl.textContent =
      "Template not loaded — run in Electron with an up-to-date preload bridge.";
    yamlPre.textContent = "";
    return;
  }
  if (!templateRes.ok) {
    metaEl.textContent = [
      `colima template --print failed (exit ${templateRes.code ?? "?"}).`,
      templateRes.stderr?.trim() || "",
    ]
      .filter(Boolean)
      .join("\n");
    yamlPre.textContent = "";
    return;
  }
  const pathLine = templateRes.path ? `Path: ${templateRes.path}` : "Path: —";
  const readLine = templateRes.readError ? `\nRead error: ${templateRes.readError}` : "";
  metaEl.textContent = pathLine + readLine;
  if (templateRes.content != null && templateRes.content !== "") {
    yamlPre.textContent = templateRes.content;
  } else if (templateRes.readError) {
    yamlPre.textContent = "";
  } else {
    yamlPre.textContent = "(empty file)";
  }
}

export function setColimaActionsDisabled(root, busy) {
  root.querySelectorAll("[data-colima-action]").forEach((btn) => {
    btn.disabled = busy;
  });
}
