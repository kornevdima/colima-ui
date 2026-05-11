/**
 * Right-click on a Kubernetes pod row → native menu; shell / logs use system terminal + kubectl.
 * @param {HTMLTableSectionElement} tbody
 */
export function wirePodRowContextMenu(tbody) {
  tbody.addEventListener("contextmenu", (e) => {
    const tr = e.target.closest("tr");
    const podName = tr?.dataset?.podName;
    const namespace = tr?.dataset?.podNamespace;
    if (!podName || !namespace) return;
    e.preventDefault();
    const api = window.colimaUi;
    if (!api?.openPodContextMenu) return;
    api.openPodContextMenu({
      podName,
      namespace,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
