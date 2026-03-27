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

  const [listRes, infoRes, psRes, imagesRes, volumesRes, networksRes, templateRes, colimaVer, dockerVer] =
    await Promise.all([
      api.colimaList(),
      api.dockerInfo(),
      api.dockerPs({ filters: containerFilterLines }),
      api.dockerImages({ filters: imageFilterLines }),
      api.dockerVolumes({ filters: volumeFilterLines }),
      api.dockerNetworks
        ? api.dockerNetworks({ filters: networkFilterLines })
        : Promise.resolve({ ok: false, networks: [], stderr: "" }),
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

  if (issues.length) {
    els.statusLine.textContent = `Refreshed with warnings — ${issues[0]}`;
    els.statusLine.classList.add("error");
  } else {
    els.statusLine.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
  }
}
