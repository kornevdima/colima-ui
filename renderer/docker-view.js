import { escapeHtml, formatBytes } from "./utils.js";

export function renderDockerSummary(rootEl, info) {
  rootEl.innerHTML = "";
  if (!info) {
    rootEl.innerHTML =
      '<div class="kv"><div class="k">Docker</div><div class="v">No data (daemon unreachable or CLI error)</div></div>';
    return;
  }
  const rows = [
    ["Server version", info.ServerVersion],
    ["Containers running", info.ContainersRunning],
    ["Containers total", info.Containers],
    ["Images", info.Images],
    ["Memory limit", info.MemoryLimit ? "yes" : "no"],
    ["CPUs (reserved)", info.NCPU],
    ["Total memory", formatBytes(info.MemTotal)],
  ];
  for (const [k, v] of rows) {
    const wrap = document.createElement("div");
    wrap.className = "kv";
    wrap.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(
      String(v ?? "—")
    )}</div>`;
    rootEl.appendChild(wrap);
  }
}

/**
 * @param {Record<string, unknown>} c
 * @returns {{ mod: string; label: string; title: string }}
 */
export function containerStatusChipMeta(c) {
  const status = String(c.Status ?? "—");
  const state = String(c.State ?? "").toLowerCase();
  if (state === "running" || /^Up\s/i.test(status)) {
    return { mod: "running", label: "Running", title: status };
  }
  if (state === "exited" || /^Exited/i.test(status)) {
    return { mod: "exited", label: "Exited", title: status };
  }
  if (state === "created" || /^Created/i.test(status)) {
    return { mod: "created", label: "Created", title: status };
  }
  if (state === "paused" || /\bpaused\b/i.test(status)) {
    return { mod: "paused", label: "Paused", title: status };
  }
  if (state === "restarting" || /restarting/i.test(status)) {
    return { mod: "restarting", label: "Restarting", title: status };
  }
  if (state === "dead" || /^Dead/i.test(status)) {
    return { mod: "dead", label: "Dead", title: status };
  }
  const short =
    status.length > 28 ? `${status.slice(0, 27)}…` : status;
  return { mod: "other", label: short, title: status };
}

export function renderContainersTable(tbodyEl, containers) {
  tbodyEl.innerHTML = "";
  if (!containers.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" class="empty">No containers (or Docker unavailable / filters excluded all).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const c of containers) {
    const tr = document.createElement("tr");
    const cid = String(c.ID ?? "").trim();
    if (cid) {
      tr.dataset.containerId = cid;
      tr.classList.add("container-row");
    }
    tr.dataset.containerPorts = String(c.Ports ?? "");
    const name = (c.Names || "").replace(/^\//, "") || c.ID?.slice(0, 12) || "—";
    const ports = c.Ports || "—";
    const size = c.Size ?? "—";
    const status = String(c.Status ?? "—");
    const chip = containerStatusChipMeta(c);
    tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${escapeHtml(
      String(c.Image || "—")
    )}</td><td class="td-status"><div class="status-cell"><span class="status-chip status-chip--${
      chip.mod
    }" title="${escapeHtml(chip.title)}">${escapeHtml(
      chip.label
    )}</span><span class="status-detail">${escapeHtml(
      status
    )}</span></div></td><td>${escapeHtml(String(ports))}</td><td>${escapeHtml(
      String(size)
    )}</td>`;
    tbodyEl.appendChild(tr);
  }
}

function isDanglingImage(img) {
  const repo = String(img.Repository ?? "");
  const tag = String(img.Tag ?? "");
  return repo === "<none>" || tag === "<none>";
}

export function renderImagesSummary(rootEl, images, filterLines) {
  rootEl.innerHTML = "";
  const n = images.length;
  const dangling = images.filter(isDanglingImage).length;
  const repos = new Set(
    images.map((i) => String(i.Repository ?? "")).filter((r) => r && r !== "<none>")
  );
  const filterNote =
    filterLines.length > 0 ? filterLines.join("; ") : "—";
  const rows = [
    ["Images listed", n],
    ["Dangling rows", dangling],
    ["Unique repositories", repos.size],
    ["Active filters", filterNote],
  ];
  for (const [k, v] of rows) {
    const wrap = document.createElement("div");
    wrap.className = "kv";
    wrap.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(
      String(v ?? "—")
    )}</div>`;
    rootEl.appendChild(wrap);
  }
}

export function renderImagesTable(tbodyEl, images) {
  tbodyEl.innerHTML = "";
  if (!images.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" class="empty">No images (or Docker unavailable / filters excluded all).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const img of images) {
    const tr = document.createElement("tr");
    const rawImageId = String(img.ID ?? img.Id ?? "").trim();
    if (rawImageId && rawImageId !== "—") {
      tr.dataset.imageId = rawImageId;
      tr.classList.add("image-row");
    }
    const repo = img.Repository ?? "—";
    const tag = img.Tag ?? "—";
    const id = img.ID ?? img.Id ?? "—";
    const created = img.CreatedSince ?? img.CreatedAt ?? "—";
    const size = img.Size ?? "—";
    tr.innerHTML = `<td>${escapeHtml(String(repo))}</td><td>${escapeHtml(
      String(tag)
    )}</td><td>${escapeHtml(String(id))}</td><td>${escapeHtml(
      String(created)
    )}</td><td>${escapeHtml(String(size))}</td>`;
    tbodyEl.appendChild(tr);
  }
}

export function renderVolumesSummary(rootEl, volumes, filterLines) {
  rootEl.innerHTML = "";
  const n = volumes.length;
  const drivers = new Set(volumes.map((v) => String(v.Driver ?? "")).filter(Boolean));
  const filterNote =
    filterLines.length > 0 ? filterLines.join("; ") : "—";
  const rows = [
    ["Volumes listed", n],
    ["Unique drivers", drivers.size],
    ["Active filters", filterNote],
  ];
  for (const [k, v] of rows) {
    const wrap = document.createElement("div");
    wrap.className = "kv";
    wrap.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(
      String(v ?? "—")
    )}</div>`;
    rootEl.appendChild(wrap);
  }
}

export function renderVolumesTable(tbodyEl, volumes) {
  tbodyEl.innerHTML = "";
  if (!volumes.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="empty">No volumes (or Docker unavailable / filters excluded all).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const v of volumes) {
    const tr = document.createElement("tr");
    const name = String(v.Name ?? "").trim();
    if (name) {
      tr.dataset.volumeName = name;
      tr.classList.add("volume-row");
    }
    const driver = v.Driver ?? "—";
    const scope = v.Scope ?? "—";
    const mp = v.Mountpoint ?? "—";
    tr.innerHTML = `<td>${escapeHtml(name || "—")}</td><td>${escapeHtml(
      String(driver)
    )}</td><td>${escapeHtml(String(scope))}</td><td>${escapeHtml(
      String(mp)
    )}</td>`;
    tbodyEl.appendChild(tr);
  }
}

export function renderNetworksSummary(rootEl, networks, filterLines) {
  rootEl.innerHTML = "";
  const n = networks.length;
  const drivers = new Set(networks.map((x) => String(x.Driver ?? "")).filter(Boolean));
  const filterNote =
    filterLines.length > 0 ? filterLines.join("; ") : "—";
  const rows = [
    ["Networks listed", n],
    ["Unique drivers", drivers.size],
    ["Active filters", filterNote],
  ];
  for (const [k, v] of rows) {
    const wrap = document.createElement("div");
    wrap.className = "kv";
    wrap.innerHTML = `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(
      String(v ?? "—")
    )}</div>`;
    rootEl.appendChild(wrap);
  }
}

function truncateCell(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function renderNetworksTable(tbodyEl, networks) {
  tbodyEl.innerHTML = "";
  if (!networks.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="8" class="empty">No networks (or Docker unavailable / filters excluded all).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const x of networks) {
    const tr = document.createElement("tr");
    const name = String(x.Name ?? "—");
    const id = String(x.ID ?? "—");
    const driver = String(x.Driver ?? "—");
    const scope = String(x.Scope ?? "—");
    const ipv4 = String(x.IPv4 ?? "—");
    const ipv6 = String(x.IPv6 ?? "—");
    const internal = String(x.Internal ?? "—");
    const labels = truncateCell(x.Labels ?? "", 72);
    tr.innerHTML = `<td>${escapeHtml(name)}</td><td>${escapeHtml(
      id
    )}</td><td>${escapeHtml(driver)}</td><td>${escapeHtml(
      scope
    )}</td><td>${escapeHtml(ipv4)}</td><td>${escapeHtml(ipv6)}</td><td>${escapeHtml(
      internal
    )}</td><td title="${escapeHtml(String(x.Labels ?? ""))}">${escapeHtml(labels)}</td>`;
    tbodyEl.appendChild(tr);
  }
}

/** Lines passed to `docker * ls -f` (one key=value per line). */
export function parseFilterLines(text) {
  return String(text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

