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
    const nsRaw = item?.metadata?.namespace;
    const nameRaw = item?.metadata?.name;
    const nsStr = nsRaw != null && String(nsRaw).trim() !== "" ? String(nsRaw).trim() : "";
    const podStr = nameRaw != null && String(nameRaw).trim() !== "" ? String(nameRaw).trim() : "";
    if (nsStr && podStr) {
      tr.dataset.podNamespace = nsStr;
      tr.dataset.podName = podStr;
    }
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

/**
 * @param {Record<string, unknown>} item
 */
function serviceType(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object") return "—";
  return String(spec.type ?? "—");
}

/**
 * @param {Record<string, unknown>} item
 */
function serviceClusterIP(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object") return "—";
  return String(spec.clusterIP ?? "—");
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function servicePortsFull(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.ports)) return "";
  const parts = [];
  for (const p of spec.ports) {
    if (!p || typeof p !== "object") continue;
    const name = p.name != null ? `${String(p.name)}:` : "";
    const proto = p.protocol && String(p.protocol) !== "TCP" ? `/${String(p.protocol)}` : "";
    const tgt = p.targetPort != null ? `→${String(p.targetPort)}` : "";
    parts.push(`${name}${String(p.port ?? "?")}${tgt}${proto}`);
  }
  return parts.join(", ");
}

/**
 * @param {Record<string, unknown>} item
 */
function servicePorts(item) {
  const full = servicePortsFull(item);
  return full ? truncate(full, 72) : "—";
}

/**
 * @param {Record<string, unknown>} item
 */
function serviceExternalIPs(item) {
  const spec = item.spec;
  const st = item.status;
  if (spec && typeof spec === "object" && Array.isArray(spec.externalIPs) && spec.externalIPs.length) {
    return truncate(spec.externalIPs.map(String).join(", "), 48);
  }
  if (st && typeof st === "object" && st.loadBalancer && typeof st.loadBalancer === "object") {
    const ing = st.loadBalancer.ingress;
    if (Array.isArray(ing) && ing.length) {
      const parts = [];
      for (const x of ing) {
        if (x && typeof x === "object") {
          if (x.ip) parts.push(String(x.ip));
          else if (x.hostname) parts.push(String(x.hostname));
        }
      }
      if (parts.length) return truncate(parts.join(", "), 48);
    }
  }
  return "—";
}

/**
 * TCP ports on a Service suitable for `kubectl port-forward … local:port`.
 * @param {Record<string, unknown>} item
 * @returns {{ port: number; name: string }[]}
 */
/**
 * `spec.selector` for matching pods behind this Service (used for aggregate `kubectl logs -l`).
 * @param {Record<string, unknown>} item
 * @returns {Record<string, string> | null}
 */
function servicePodSelectorForLogs(item) {
  const spec = item.spec;
  const sel = spec?.selector;
  if (!sel || typeof sel !== "object" || Array.isArray(sel)) return null;
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(sel)) {
    if (v == null) continue;
    out[String(k)] = String(v);
  }
  return Object.keys(out).length ? out : null;
}

function serviceTcpForwardPorts(item) {
  const spec = item.spec;
  if (!spec || typeof spec !== "object" || !Array.isArray(spec.ports)) return [];
  const out = [];
  for (const p of spec.ports) {
    if (!p || typeof p !== "object") continue;
    const proto = String(p.protocol ?? "TCP").toUpperCase();
    if (proto !== "TCP") continue;
    const port = p.port;
    if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
      continue;
    }
    out.push({
      port,
      name: p.name != null ? String(p.name) : "",
    });
  }
  return out;
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} items
 */
export function renderK8sServicesTable(tbodyEl, items) {
  tbodyEl.innerHTML = "";
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="6" class="empty">No services (wrong namespace, cluster unreachable, or list empty).</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (const item of rows) {
    const tr = document.createElement("tr");
    const portsFull = servicePortsFull(item);
    const nsRaw = item?.metadata?.namespace;
    const nameRaw = item?.metadata?.name;
    const nsStr = nsRaw != null && String(nsRaw).trim() !== "" ? String(nsRaw).trim() : "";
    const svcStr = nameRaw != null && String(nameRaw).trim() !== "" ? String(nameRaw).trim() : "";
    if (nsStr && svcStr) {
      tr.dataset.serviceName = svcStr;
      tr.dataset.serviceNamespace = nsStr;
      const fwd = serviceTcpForwardPorts(item);
      if (fwd.length) tr.dataset.serviceForwardPorts = JSON.stringify(fwd);
      const logSel = servicePodSelectorForLogs(item);
      if (logSel) tr.dataset.serviceLogSelector = JSON.stringify(logSel);
    }
    tr.innerHTML = `<td>${escapeHtml(metaNs(item))}</td><td>${escapeHtml(
      metaName(item)
    )}</td><td>${escapeHtml(serviceType(item))}</td><td>${escapeHtml(
      serviceClusterIP(item)
    )}</td><td title="${escapeHtml(portsFull)}">${escapeHtml(
      servicePorts(item)
    )}</td><td>${escapeHtml(serviceExternalIPs(item))}</td>`;
    tbodyEl.appendChild(tr);
  }
}
