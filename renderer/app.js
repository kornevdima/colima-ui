import { $ } from "./utils.js";
import { refreshAll } from "./refresh.js";
import {
  setupSidebar,
  setActiveNav,
  showView,
  syncAccordionForView,
} from "./sidebar.js";
import { wireColimaActions } from "./colima-actions.js";
import { applyColimaUiDefaultsToForm } from "./colima-view.js";
import { wireContainerRowContextMenu } from "./containers-context.js";
import { wireImageRowContextMenu } from "./images-context.js";
import { wireVolumeRowContextMenu } from "./volumes-context.js";

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
  const volumesSummary = $("docker-volumes-summary");
  const volumesTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#volumes-table tbody")
  );
  const volumesFilter = /** @type {HTMLTextAreaElement} */ ($("volumes-filter"));
  const colimaRuntimeRoot = $("view-colima-runtime");
  const colimaTemplateRoot = $("view-colima-template");
  const colimaTemplateMeta = $("colima-template-meta");
  const colimaTemplateYaml = /** @type {HTMLPreElement} */ ($("colima-template-yaml"));
  const profilesTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#profiles-table tbody")
  );

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
    volumesSummary,
    volumesTbody,
    volumesFilter,
    profilesTbody,
    colimaTemplateMeta,
    colimaTemplateYaml,
  };

  async function refresh() {
    await refreshAll(window.colimaUi, els);
  }

  function navigate(view) {
    setActiveNav(view);
    showView(view);
    syncAccordionForView(view);
  }

  setupSidebar({
    onRefresh: () => refresh(),
    onNavigate: (view) => navigate(view),
  });

  wireColimaActions({
    colimaRoot: colimaRuntimeRoot,
    colimaTemplateRoot,
    profileSelect,
    setStatus: (msg, err) => setStatus(statusLine, msg, err),
    refresh,
  });

  const api = window.colimaUi;
  if (api?.colimaUiDefaults) {
    api
      .colimaUiDefaults()
      .then((d) => applyColimaUiDefaultsToForm(colimaRuntimeRoot, d))
      .catch(() => {});
  }

  wireContainerRowContextMenu(containersTbody);
  wireImageRowContextMenu(imagesTbody);
  wireVolumeRowContextMenu(volumesTbody);

  if (api?.onDockerMutation) {
    api.onDockerMutation(() => {
      refresh().catch(() => {});
    });
  }

  navigate("colima-runtime");
  refresh();
}

main();
