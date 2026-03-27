/**
 * Right-click on an image row → remove via native menu (confirmed `docker rmi -f`).
 * @param {HTMLTableSectionElement} tbody
 */
export function wireImageRowContextMenu(tbody) {
  tbody.addEventListener("contextmenu", (e) => {
    const tr = e.target.closest("tr");
    const imageId = tr?.dataset?.imageId;
    if (!imageId) return;
    e.preventDefault();
    const api = window.colimaUi;
    if (!api?.openImageContextMenu) return;
    api.openImageContextMenu({
      imageId,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
