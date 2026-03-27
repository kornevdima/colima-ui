import {
  fillProfileSelect,
  renderColimaTelemetry,
  renderColimaTemplate,
  renderProfilesTable,
} from "./colima-view.js";
import {
  renderDockerSummary,
  renderContainersTable,
  renderImagesSummary,
  renderImagesTable,
  renderVolumesSummary,
  renderVolumesTable,
  renderNetworksSummary,
  renderNetworksTable,
  parseFilterLines,
} from "./docker-view.js";
import {
  renderK8sCountSummary,
  renderK8sNodesTable,
  renderK8sPodsTable,
  renderK8sGatewaysTable,
  renderK8sVirtualServicesTable,
} from "./k8s-view.js";

/**
 * @param {typeof window.colimaUi} api
 * @param {{
 *   profileSelect: HTMLSelectElement;
 *   statusLine: HTMLElement;
 *   versionsEl: HTMLElement;
 *   colimaPre: HTMLElement;
 *   dockerSummary: HTMLElement;
 *   containersTbody: HTMLTableSectionElement;
 *   containersFilter: HTMLTextAreaElement;
 *   imagesSummary: HTMLElement;
 *   imagesTbody: HTMLTableSectionElement;
 *   imagesFilter: HTMLTextAreaElement;
 *   volumesSummary: HTMLElement;
 *   volumesTbody: HTMLTableSectionElement;
 *   volumesFilter: HTMLTextAreaElement;
 *   networksSummary: HTMLElement;
 *   networksTbody: HTMLTableSectionElement;
 *   networksFilter: HTMLTextAreaElement;
 *   profilesTbody: HTMLTableSectionElement;
 *   colimaTemplateMeta: HTMLElement;
 *   colimaTemplateYaml: HTMLPreElement;
 *   k8sNodesSummary: HTMLElement;
 *   k8sNodesTbody: HTMLTableSectionElement;
 *   k8sPodsSummary: HTMLElement;
 *   k8sPodsTbody: HTMLTableSectionElement;
 *   k8sGatewaysSummary: HTMLElement;
 *   k8sGatewaysTbody: HTMLTableSectionElement;
 *   k8sVsSummary: HTMLElement;
 *   k8sVsTbody: HTMLTableSectionElement;
 * }} els
 */
export async function refreshAll(api, els) {
  els.statusLine.textContent = "Loading…";
  els.statusLine.classList.remove("error");

  if (!api) {
    els.statusLine.textContent = "Preload bridge missing — run with Electron.";
    els.statusLine.classList.add("error");
    return;
  }

  const imageFilterLines = parseFilterLines(els.imagesFilter.value);
  const containerFilterLines = parseFilterLines(els.containersFilter.value);
  const volumeFilterLines = parseFilterLines(els.volumesFilter.value);
  const networkFilterLines = parseFilterLines(els.networksFilter.value);

  const k8sStub = { ok: true, items: [], stderr: "", skipped: true };
  const [
    listRes,
    infoRes,
    psRes,
    imagesRes,
    volumesRes,
    networksRes,
    k8sNodesRes,
    k8sPodsRes,
    k8sGwRes,
    k8sVsRes,
    templateRes,
    colimaVer,
    dockerVer,
  ] = await Promise.all([
    api.colimaList(),
    api.dockerInfo(),
    api.dockerPs({ filters: containerFilterLines }),
    api.dockerImages({ filters: imageFilterLines }),
    api.dockerVolumes({ filters: volumeFilterLines }),
    api.dockerNetworks
      ? api.dockerNetworks({ filters: networkFilterLines })
      : Promise.resolve({ ok: false, networks: [], stderr: "" }),
    api.kubernetesGetNodes ? api.kubernetesGetNodes() : Promise.resolve(k8sStub),
    api.kubernetesGetPods ? api.kubernetesGetPods() : Promise.resolve(k8sStub),
    api.kubernetesGetGateways ? api.kubernetesGetGateways() : Promise.resolve(k8sStub),
    api.kubernetesGetVirtualServices
      ? api.kubernetesGetVirtualServices()
      : Promise.resolve(k8sStub),
    api.colimaTemplate ? api.colimaTemplate() : Promise.resolve(null),
    api.colimaVersion(),
    api.dockerVersion(),
  ]);

  fillProfileSelect(els.profileSelect, listRes.instances || []);
  const profile = els.profileSelect.value || undefined;
  const statusRes = await api.colimaStatus(profile);

  renderColimaTelemetry(els.colimaPre, listRes, statusRes);
  renderProfilesTable(els.profilesTbody, listRes.instances || []);
  renderColimaTemplate(els.colimaTemplateMeta, els.colimaTemplateYaml, templateRes);
  renderDockerSummary(els.dockerSummary, infoRes.info);
  renderContainersTable(els.containersTbody, psRes.containers || []);
  renderImagesSummary(els.imagesSummary, imagesRes.images || [], imageFilterLines);
  renderImagesTable(els.imagesTbody, imagesRes.images || []);
  renderVolumesSummary(els.volumesSummary, volumesRes.volumes || [], volumeFilterLines);
  renderVolumesTable(els.volumesTbody, volumesRes.volumes || []);
  renderNetworksSummary(els.networksSummary, networksRes.networks || [], networkFilterLines);
  renderNetworksTable(els.networksTbody, networksRes.networks || []);

  renderK8sCountSummary(els.k8sNodesSummary, k8sNodesRes.items || [], "Nodes");
  renderK8sNodesTable(els.k8sNodesTbody, k8sNodesRes.items || []);
  renderK8sCountSummary(els.k8sPodsSummary, k8sPodsRes.items || [], "Pods (all namespaces)");
  renderK8sPodsTable(els.k8sPodsTbody, k8sPodsRes.items || []);
  renderK8sCountSummary(els.k8sGatewaysSummary, k8sGwRes.items || [], "Istio Gateways");
  renderK8sGatewaysTable(els.k8sGatewaysTbody, k8sGwRes.items || []);
  renderK8sCountSummary(els.k8sVsSummary, k8sVsRes.items || [], "Istio VirtualServices");
  renderK8sVirtualServicesTable(els.k8sVsTbody, k8sVsRes.items || []);

  const cv = colimaVer.ok
    ? colimaVer.stdout.trim().split("\n")[0]
    : `colima: ${colimaVer.stderr?.trim() || "error"}`;
  const dv = dockerVer.ok
    ? (() => {
        try {
          const j = JSON.parse(dockerVer.stdout);
          return `docker ${j.Client?.Version ?? ""} / ${j.Server?.Version ?? ""}`.trim();
        } catch {
          return dockerVer.stdout.trim().split("\n")[0];
        }
      })()
    : `docker: ${dockerVer.stderr?.trim() || "error"}`;
  els.versionsEl.textContent = `${cv} · ${dv}`;

  const issues = [];
  if (listRes.parseError) issues.push(`list parse: ${listRes.parseError}`);
  if (!listRes.ok && listRes.stderr) issues.push(`colima list: ${listRes.stderr.trim()}`);
  if (!infoRes.ok && infoRes.stderr) issues.push(`docker info: ${infoRes.stderr.trim()}`);
  if (!psRes.ok && psRes.stderr) issues.push(`docker ps: ${psRes.stderr.trim()}`);
  if (!imagesRes.ok && imagesRes.stderr)
    issues.push(`docker image ls: ${imagesRes.stderr.trim()}`);
  if (!volumesRes.ok && volumesRes.stderr)
    issues.push(`docker volume ls: ${volumesRes.stderr.trim()}`);
  if (!networksRes.ok && networksRes.stderr)
    issues.push(`docker network ls: ${networksRes.stderr.trim()}`);
  if (templateRes && !templateRes.ok && templateRes.stderr)
    issues.push(`colima template --print: ${templateRes.stderr.trim()}`);
  else if (templateRes?.readError) issues.push(`template file: ${templateRes.readError}`);

  if (k8sNodesRes && !k8sNodesRes.skipped && !k8sNodesRes.ok && k8sNodesRes.stderr) {
    issues.push(`kubectl get nodes: ${k8sNodesRes.stderr.trim()}`);
  } else if (k8sNodesRes?.parseError) {
    issues.push(`kubectl nodes JSON: ${k8sNodesRes.parseError}`);
  }
  if (k8sPodsRes && !k8sPodsRes.skipped && !k8sPodsRes.ok && k8sPodsRes.stderr) {
    issues.push(`kubectl get pods: ${k8sPodsRes.stderr.trim()}`);
  }
  if (k8sGwRes && !k8sGwRes.skipped && !k8sGwRes.ok && k8sGwRes.stderr) {
    issues.push(`kubectl get gateway (Istio): ${k8sGwRes.stderr.trim()}`);
  }
  if (k8sVsRes && !k8sVsRes.skipped && !k8sVsRes.ok && k8sVsRes.stderr) {
    issues.push(`kubectl get virtualservice: ${k8sVsRes.stderr.trim()}`);
  }

  if (issues.length) {
    els.statusLine.textContent = `Refreshed with warnings — ${issues[0]}`;
    els.statusLine.classList.add("error");
  } else {
    els.statusLine.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
  }
}
