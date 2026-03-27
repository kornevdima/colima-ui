import { publishedHttpUrlsFromDockerPorts } from "./docker-ports.js";

/**
 * Right-click on a container row → native menu; attach/exec use terminal; remove / open URL in main.
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
    const portsRaw = tr.dataset.containerPorts ?? "";
    const browserUrls = publishedHttpUrlsFromDockerPorts(portsRaw);
    // Electron `Menu.popup` x/y are DIP, relative to the web content top-left — not screen coords.
    api.openContainerContextMenu({
      containerId: id,
      browserUrls,
      x: e.clientX,
      y: e.clientY,
    });
  });
}
