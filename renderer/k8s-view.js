import { escapeHtml } from "./utils.js";

function metaName(item) {
  return String(item?.metadata?.name ?? "—");
}

function metaNs(item) {
  return item?.metadata?.namespace != null ? String(item.metadata.namespace) : "—";
}

function truncate(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * @param {HTMLElement} rootEl
 * @param {Record<string, unknown>[]} items
 * @param {string} label
 */
export function renderK8sCountSummary(rootEl, items, label) {
  rootEl.innerHTML = "";
  const n = Array.isArray(items) ? items.length : 0;
  const wrap = document.createElement("div");
  wrap.className = "kv";
  wrap.innerHTML = `<div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(
    String(n)
  )}</div>`;
  rootEl.appendChild(wrap);
}

/**
 * @param {Record<string, unknown>} item
 */
function nodeReady(item) {
  const st = item.status;
  if (!st || typeof st !== "object" || !Array.isArray(st.conditions)) return "—";
  const ready = st.conditions.find(
    (c) => c && typeof c === "object" && c.type === "Ready"
  );
  return ready && typeof ready.status === "string" ? ready.status : "—";
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function nodeAddressesFull(item) {
  const st = item.status;
  if (!st || typeof st !== "object" || !Array.isArray(st.addresses)) return "";
  const parts = [];
  for (const a of st.addresses) {
    if (a && typeof a === "object" && "address" in a) {
      parts.push(`${String(a.type ?? "?")}:${String(a.address)}`);
    }
  }
  return parts.join(", ");
}

/**
 * @param {Record<string, unknown>} item
 */
function nodeAddresses(item) {
  const full = nodeAddressesFull(item);
  return full ? truncate(full, 64) : "—";
}

/**
 * @param {Record<string, unknown>} item
 */
function nodeKubeletVersion(item) {
  const st = item.status;
  if (!st || typeof st !== "object") return "—";
  const ni = st.nodeInfo;
  if (!ni || typeof ni !== "object") return "—";
  return String(ni.kubeletVersion ?? "—");
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} items
 */
export function renderK8sNodesTable(tbodyEl, items) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="empty">No nodes (cluster unreachable, kubectl context, or list empty).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const item of rows) {
    const tr = document.createElement("tr");
    const addrFull = nodeAddressesFull(item);
    tr.innerHTML = `<td>${escapeHtml(metaName(item))}</td><td>${escapeHtml(
      nodeReady(item)
    )}</td><td>${escapeHtml(nodeKubeletVersion(item))}</td><td title="${escapeHtml(
      addrFull
    )}">${escapeHtml(nodeAddresses(item))}</td>`;
    tbodyEl.appendChild(tr);
  }
}

/**
 * @param {Record<string, unknown>} item
 */
function podPhase(item) {
  const st = item.status;
  if (!st || typeof st !== "object") return "—";
  return String(st.phase ?? "—");
}

/**
 * @param {Record<string, unknown>} item
 */
function podReadyLine(item) {
  const st = item.status;
  if (!st || typeof st !== "object" || !Array.isArray(st.containerStatuses)) return "—";
  const cs = st.containerStatuses;
  if (!Array.isArray(cs)) return "—";
  const total = cs.length;
  const ready = cs.filter((c) => c && typeof c === "object" && c.ready).length;
  const restarts = cs.reduce((sum, c) => {
    if (c && typeof c === "object" && typeof c.restartCount === "number") {
      return sum + c.restartCount;
    }
    return sum;
  }, 0);
  return `${ready}/${total} · restarts ${restarts}`;
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} items
 */
export function renderK8sPodsTable(tbodyEl, items) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" class="empty">No pods (or unable to list — check <code>kubectl get pods -A</code>).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const item of rows) {
    const tr = document.createElement("tr");
    const spec = item.spec;
    const node =
      spec && typeof spec === "object" && spec.nodeName != null
        ? String(spec.nodeName)
        : "—";
    tr.innerHTML = `<td>${escapeHtml(metaNs(item))}</td><td>${escapeHtml(
      metaName(item)
    )}</td><td>${escapeHtml(podPhase(item))}</td><td>${escapeHtml(
      podReadyLine(item)
    )}</td><td>${escapeHtml(node)}</td>`;
    tbodyEl.appendChild(tr);
  }
}

/**
 * @param {Record<string, unknown>} item
 */
function gatewayHosts(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.servers)) return "—";
  const servers = spec.servers;
  const hosts = [];
  for (const srv of servers) {
    if (srv && typeof srv === "object" && Array.isArray(srv.hosts)) {
      hosts.push(...srv.hosts.map(String));
    }
  }
  return hosts.length ? truncate(hosts.join(", "), 80) : "—";
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} items
 */
export function renderK8sGatewaysTable(tbodyEl, items) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="3" class="empty">No Istio Gateways (install Istio or check CRD <code>gateway.networking.istio.io</code>).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const item of rows) {
    const tr = document.createElement("tr");
    const spec = item.spec;
    const hosts = (() => {
      if (!spec || typeof spec !== "object" || !Array.isArray(spec.servers)) return "";
      const h = [];
      for (const srv of spec.servers) {
        if (srv && typeof srv === "object" && Array.isArray(srv.hosts)) {
          h.push(...srv.hosts.map(String));
        }
      }
      return h.join(", ");
    })();
    tr.innerHTML = `<td>${escapeHtml(metaNs(item))}</td><td>${escapeHtml(
      metaName(item)
    )}</td><td title="${escapeHtml(hosts)}">${escapeHtml(gatewayHosts(item))}</td>`;
    tbodyEl.appendChild(tr);
  }
}

/**
 * @param {Record<string, unknown>} item
 */
function vsHosts(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.hosts)) return "—";
  return truncate(spec.hosts.map(String).join(", "), 72);
}

/**
 * @param {Record<string, unknown>} item
 */
function vsGateways(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object") return "—";
  const g = spec.gateways;
  if (Array.isArray(g)) return truncate(g.map(String).join(", "), 48);
  if (g != null) return truncate(String(g), 48);
  return "—";
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} items
 */
export function renderK8sVirtualServicesTable(tbodyEl, items) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="4" class="empty">No Istio VirtualServices (CRD <code>virtualservice.networking.istio.io</code>).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const item of rows) {
    const tr = document.createElement("tr");
    const sp = item.spec;
    const fullHosts =
      sp && typeof sp === "object" && Array.isArray(sp.hosts)
        ? sp.hosts.map(String).join(", ")
        : "";
    tr.innerHTML = `<td>${escapeHtml(metaNs(item))}</td><td>${escapeHtml(
      metaName(item)
    )}</td><td title="${escapeHtml(fullHosts)}">${escapeHtml(
      vsHosts(item)
    )}</td><td>${escapeHtml(vsGateways(item))}</td>`;
    tbodyEl.appendChild(tr);
  }
}
