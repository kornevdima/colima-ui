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
import { renderCommandLogTable } from "./command-log-view.js";

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
  const networksSummary = $("docker-networks-summary");
  const networksTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#networks-table tbody")
  );
  const networksFilter = /** @type {HTMLTextAreaElement} */ ($("networks-filter"));
  const colimaRuntimeRoot = $("view-colima-runtime");
  const colimaTemplateRoot = $("view-colima-template");
  const colimaTemplateMeta = $("colima-template-meta");
  const colimaTemplateYaml = /** @type {HTMLPreElement} */ ($("colima-template-yaml"));
  const profilesTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#profiles-table tbody")
  );
  const commandLogTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#command-log-table tbody")
  );
  const k8sNodesSummary = $("k8s-nodes-summary");
  const k8sNodesTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#k8s-nodes-table tbody")
  );
  const k8sPodsSummary = $("k8s-pods-summary");
  const k8sPodsTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#k8s-pods-table tbody")
  );
  const k8sGatewaysSummary = $("k8s-gateways-summary");
  const k8sGatewaysTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#k8s-gateways-table tbody")
  );
  const k8sVsSummary = $("k8s-vs-summary");
  const k8sVsTbody = /** @type {HTMLTableSectionElement} */ (
    document.querySelector("#k8s-vs-table tbody")
  );

  let activeView = "colima-runtime";

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
    networksSummary,
    networksTbody,
    networksFilter,
    profilesTbody,
    colimaTemplateMeta,
    colimaTemplateYaml,
    k8sNodesSummary,
    k8sNodesTbody,
    k8sPodsSummary,
    k8sPodsTbody,
    k8sGatewaysSummary,
    k8sGatewaysTbody,
    k8sVsSummary,
    k8sVsTbody,
  };

  async function refresh() {
    await refreshAll(window.colimaUi, els);
  }

  async function loadCommandLog() {
    const ui = window.colimaUi;
    if (!ui?.commandLogGet) {
      renderCommandLogTable(commandLogTbody, []);
      return;
    }
    try {
      const r = await ui.commandLogGet();
      renderCommandLogTable(commandLogTbody, r.entries || []);
    } catch {
      renderCommandLogTable(commandLogTbody, []);
    }
  }

  function navigate(view) {
    activeView = view;
    setActiveNav(view);
    showView(view);
    syncAccordionForView(view);
    if (view === "app-logs") {
      loadCommandLog().catch(() => {});
    }
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

  if (api?.onCommandLogAppend) {
    api.onCommandLogAppend(() => {
      if (activeView === "app-logs") {
        loadCommandLog().catch(() => {});
      }
    });
  }

  if (api?.onCommandLogCleared) {
    api.onCommandLogCleared(() => {
      if (activeView === "app-logs") {
        renderCommandLogTable(commandLogTbody, []);
      }
    });
  }

  document.getElementById("command-log-clear")?.addEventListener("click", async () => {
    if (!api?.commandLogClear) return;
    try {
      await api.commandLogClear();
      renderCommandLogTable(commandLogTbody, []);
    } catch {
      /* ignore */
    }
  });

  navigate("colima-runtime");
  refresh();
}

main();
