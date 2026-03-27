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

export function setColimaActionsDisabled(root, busy) {
  root.querySelectorAll("[data-colima-action]").forEach((btn) => {
    btn.disabled = busy;
  });
}
