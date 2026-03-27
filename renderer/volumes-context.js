/**
 * Right-click on a volume row → remove via native menu (confirmed `docker volume rm -f`).
 * @param {HTMLTableSectionElement} tbody
 */
export function wireVolumeRowContextMenu(tbody) {
  tbody.addEventListener("contextmenu", (e) => {
    const tr = e.target.closest("tr");
    const volumeName = tr?.dataset?.volumeName;
    if (!volumeName) return;
    e.preventDefault();
    const api = window.colimaUi;
    if (!api?.openVolumeContextMenu) return;
    api.openVolumeContextMenu({
      volumeName,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
