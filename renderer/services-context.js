/**
 * Right-click on a Kubernetes Service row → port-forward + aggregate logs (`kubectl`).
 * @param {HTMLTableSectionElement} tbody
 */
export function wireServiceRowContextMenu(tbody) {
  tbody.addEventListener("contextmenu", (e) => {
    const tr = e.target.closest("tr");
    const serviceName = tr?.dataset?.serviceName;
    const namespace = tr?.dataset?.serviceNamespace;
    if (!serviceName || !namespace) return;
    e.preventDefault();
    const api = window.colimaUi;
    if (!api?.openServiceContextMenu) return;
    let ports = [];
    try {
      ports = JSON.parse(tr.dataset.serviceForwardPorts || "[]");
    } catch {
      ports = [];
    }
    if (!Array.isArray(ports)) ports = [];
    let logSelector = null;
    try {
      const raw = tr.dataset.serviceLogSelector;
      if (raw) {
        const j = JSON.parse(raw);
        if (j && typeof j === "object" && !Array.isArray(j)) logSelector = j;
      }
    } catch {
      logSelector = null;
    }
    api.openServiceContextMenu({
      serviceName,
      namespace,
      ports,
      logSelector,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
