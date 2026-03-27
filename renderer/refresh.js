import { fillProfileSelect, renderColimaTelemetry } from "./colima-view.js";
import {
  renderDockerSummary,
  renderContainersTable,
  renderImagesSummary,
  renderImagesTable,
  renderVolumesSummary,
  renderVolumesTable,
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

  const [listRes, infoRes, psRes, imagesRes, volumesRes, colimaVer, dockerVer] =
    await Promise.all([
      api.colimaList(),
      api.dockerInfo(),
      api.dockerPs({ filters: containerFilterLines }),
      api.dockerImages({ filters: imageFilterLines }),
      api.dockerVolumes({ filters: volumeFilterLines }),
      api.colimaVersion(),
      api.dockerVersion(),
    ]);

  fillProfileSelect(els.profileSelect, listRes.instances || []);
  const profile = els.profileSelect.value || undefined;
  const statusRes = await api.colimaStatus(profile);

  renderColimaTelemetry(els.colimaPre, listRes, statusRes);
  renderDockerSummary(els.dockerSummary, infoRes.info);
  renderContainersTable(els.containersTbody, psRes.containers || []);
  renderImagesSummary(els.imagesSummary, imagesRes.images || [], imageFilterLines);
  renderImagesTable(els.imagesTbody, imagesRes.images || []);
  renderVolumesSummary(els.volumesSummary, volumesRes.volumes || [], volumeFilterLines);
  renderVolumesTable(els.volumesTbody, volumesRes.volumes || []);

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

  if (issues.length) {
    els.statusLine.textContent = `Refreshed with warnings — ${issues[0]}`;
    els.statusLine.classList.add("error");
  } else {
    els.statusLine.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
  }
}
