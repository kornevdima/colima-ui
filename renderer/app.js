import { $ } from "./utils.js";
import { refreshAll } from "./refresh.js";
import { setupSidebar, setActiveNav, showView } from "./sidebar.js";
import { wireColimaActions } from "./colima-actions.js";
import { wireContainerRowContextMenu } from "./containers-context.js";

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle("error", Boolean(isError));
}

function main() {
  const statusLine = $("status-line");
  const profileSelect = /** @type {HTMLSelectElement} */ ($("sidebar-profile"));
  const versionsEl = $("sidebar-versions");
  const colimaPre = $("colima-json");
  const dockerSummary = $("docker-summary");
  const containersTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#containers-table tbody")
  );
  const imagesSummary = $("docker-images-summary");
  const imagesTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#images-table tbody")
  );
  const imagesFilter = /** @type {HTMLTextAreaElement} */ ($("images-filter"));
  const containersFilter = /** @type {HTMLTextAreaElement} */ ($("containers-filter"));
  const colimaRoot = $("view-colima");

  const els = {
    profileSelect,
    statusLine,
    versionsEl,
    colimaPre,
    dockerSummary,
    containersTbody,
    containersFilter,
    imagesSummary,
    imagesTbody,
    imagesFilter,
  };

  async function refresh() {
    await refreshAll(window.colimaUi, els);
  }

  function navigate(view) {
    setActiveNav(view);
    showView(view);
  }

  setupSidebar({
    onRefresh: () => refresh(),
    onNavigate: (view) => navigate(view),
  });

  wireColimaActions({
    colimaRoot,
    profileSelect,
    setStatus: (msg, err) => setStatus(statusLine, msg, err),
    refresh,
  });

  wireContainerRowContextMenu(containersTbody);

  navigate("colima");
  refresh();
}

main();
