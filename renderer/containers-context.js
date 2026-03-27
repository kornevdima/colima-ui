/**
 * Right-click on a container row → native menu; actions run docker in the system terminal.
 * @param {HTMLTableSectionElement} tbody
 */
export function wireContainerRowContextMenu(tbody) {
  tbody.addEventListener("contextmenu", (e) => {
    const tr = e.target.closest("tr");
    const id = tr?.dataset?.containerId;
    if (!id) return;
    e.preventDefault();
    const api = window.colimaUi;
    if (!api?.openContainerContextMenu) return;
    // Electron `Menu.popup` x/y are DIP, relative to the web content top-left — not screen coords.
    api.openContainerContextMenu({
      containerId: id,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
