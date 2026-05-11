const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require("electron");
const path = require("path");
const { createLogger } = require("./lib/logger");
const { getEffectiveConfig } = require("./lib/runtime-config");
const { getSettingsViewModel } = require("./lib/settings-presenter");
const { createColimaOperations } = require("./domain/colima/colima-operations");
const { createDockerOperations } = require("./domain/docker/docker-operations");
const { createKubernetesOperations } = require("./domain/kubernetes/kubernetes-operations");
const { launchDockerInTerminal, launchEditorInTerminal } = require("./lib/terminal-launch");
const {
  isValidContainerId,
  isValidDockerImageId,
  isValidDockerVolumeName,
} = require("./lib/docker-identifiers");
const {
  isValidPodContextTarget,
  isValidKubernetesSubdomainName,
  isValidK8sTcpPort,
  buildServiceLogsLabelSelector,
} = require("./lib/k8s-identifiers");
const { setAfterRunHook } = require("./lib/cli");
const commandLog = require("./lib/command-log");
const userSettings = require("./lib/user-settings");

function broadcastCommandLogEntry(entry) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue;
    w.webContents.send("command-log:append", entry);
  }
}

function broadcastCommandLogCleared() {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue;
    w.webContents.send("command-log:cleared");
  }
}

commandLog.setBroadcast(broadcastCommandLogEntry);
setAfterRunHook((meta) => {
  commandLog.append(meta);
});

const log = createLogger(() => getEffectiveConfig().logging);
const colima = createColimaOperations({ getConfig: getEffectiveConfig, log });
const docker = createDockerOperations({ getConfig: getEffectiveConfig, log });
const kubernetes = createKubernetesOperations({ getConfig: getEffectiveConfig, log });

/** After successful `docker rm` / `rmi` / `volume rm`, tell renderer to refresh. */
function sendDockerMutation(win) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("docker:mutation");
  }
}

/** After successful `kubectl delete pod|service`, tell renderer to refresh K8s tables. */
function sendKubernetesMutation(win) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("kubernetes:mutation");
  }
}

/** @param {unknown} list */
function sanitizeBrowserUrlsForOpen(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const u of list) {
    if (typeof u !== "string") continue;
    try {
      const p = new URL(u);
      if (p.protocol !== "http:" && p.protocol !== "https:") continue;
      if (!p.hostname) continue;
      out.push(u);
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out)];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 880,
    minHeight: 520,
    title: "Colima UI",
    icon: path.join(__dirname, "logo-colima.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  userSettings.init(app.getPath("userData"));
  const c = getEffectiveConfig();
  log.info("app.ready", { colimaBin: c.colima.bin, dockerBin: c.docker.bin });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("settings:get", () => getSettingsViewModel());
ipcMain.handle("settings:set", (_e, payload) => {
  try {
    const values = payload?.values && typeof payload.values === "object" ? payload.values : {};
    userSettings.saveFromValuesRecord(values);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});
ipcMain.handle("settings:reset", () => {
  userSettings.clearAll();
  return { ok: true };
});

ipcMain.handle("command-log:get", () => ({ entries: commandLog.getAll() }));
ipcMain.handle("command-log:clear", () => {
  commandLog.clear();
  broadcastCommandLogCleared();
  return { ok: true };
});

ipcMain.handle("colima:list", () => colima.listInstances());
ipcMain.handle("colima:status", (_e, profile) => colima.getStatus(profile));
ipcMain.handle("colima:start", (_e, options) => colima.start(options ?? {}));
ipcMain.handle("colima:stop", (_e, options) => colima.stop(options ?? {}));
ipcMain.handle("colima:version", () => colima.getVersion());
ipcMain.handle("colima:uiDefaults", () => {
  const c = getEffectiveConfig();
  return {
    startDefaults: { ...c.colima.startDefaults },
    startKubernetes: { ...c.colima.startKubernetes },
    templateEditor: c.colima.templateEditor,
  };
});

ipcMain.handle("colima:template", () => colima.getTemplate());

ipcMain.handle("colima:templateEditInTerminal", async (event) => {
  const t = await colima.getTemplate();
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!t.ok || !t.path) {
    const detail = [t.stderr?.trim(), t.readError].filter(Boolean).join("\n") || "colima template --print failed";
    if (win) {
      await dialog.showMessageBox(win, {
        type: "error",
        title: "Colima template",
        message: "Could not resolve the template file path.",
        detail,
      });
    }
    return { ok: false, detail };
  }
  const editor = getEffectiveConfig().colima.templateEditor;
  launchEditorInTerminal({ editorBin: editor, filePath: t.path });
  return { ok: true, path: t.path, editor };
});

ipcMain.handle("docker:info", () => docker.getInfo());
ipcMain.handle("docker:ps", (_e, options) => docker.listContainers(options ?? {}));
ipcMain.handle("docker:images", (_e, options) => docker.listImages(options ?? {}));
ipcMain.handle("docker:volumes", (_e, options) => docker.listVolumes(options ?? {}));
ipcMain.handle("docker:networks", (_e, options) => docker.listNetworks(options ?? {}));
ipcMain.handle("docker:version", () => docker.getVersion());

/**
 * Native context menu for a container row; attach/exec/logs use the system terminal; remove runs `docker rm -f`.
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {{ containerId?: string; browserUrls?: string[]; x?: number; y?: number }} payload — x/y = client/content DIP (from `clientX`/`clientY`)
 */
ipcMain.handle("containers:contextMenu", (event, payload) => {
  const id = String(payload?.containerId ?? "").trim();
  if (!isValidContainerId(id)) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const dockerBin = getEffectiveConfig().docker.bin;
  const browserUrls = sanitizeBrowserUrlsForOpen(payload?.browserUrls);

  const template = [
    {
      label: "Attach in Terminal",
      click: () =>
        launchDockerInTerminal({
          dockerBin,
          dockerArgs: ["attach", id],
        }),
    },
    {
      label: "Shell in Terminal (exec -it /bin/sh)",
      click: () =>
        launchDockerInTerminal({
          dockerBin,
          dockerArgs: ["exec", "-it", id, "/bin/sh"],
        }),
    },
    {
      label: "Tail logs in Terminal",
      click: () =>
        launchDockerInTerminal({
          dockerBin,
          dockerArgs: ["logs", "-f", "--tail", "200", id],
        }),
    },
  ];

  if (browserUrls.length > 0) {
    template.push({
      label: "Open in browser",
      submenu: browserUrls.map((url) => ({
        label: url.replace(/^https?:\/\//, ""),
        click: () => shell.openExternal(url),
      })),
    });
  }

  template.push(
    { type: "separator" },
    {
      label: "Remove container…",
      click: async () => {
        const { response } = await dialog.showMessageBox(win, {
          type: "warning",
          buttons: ["Cancel", "Remove"],
          defaultId: 0,
          cancelId: 0,
          message: "Remove this container?",
          detail: `Runs: docker rm -f\n\nID: ${id}`,
        });
        if (response !== 1) return;
        const r = await docker.removeContainer(id);
        if (r.ok) {
          sendDockerMutation(win);
        } else {
          await dialog.showMessageBox(win, {
            type: "error",
            title: "docker rm failed",
            message: r.stderr?.trim() || `Exit code ${r.code ?? "?"}`,
          });
        }
      },
    }
  );

  const menu = Menu.buildFromTemplate(template);
  const popupOpts = { window: win };
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    popupOpts.x = Math.round(x);
    popupOpts.y = Math.round(y);
  }
  menu.popup(popupOpts);
});

/**
 * Native context menu for a Kubernetes pod row: shell and logs in system terminal (`kubectl`).
 */
ipcMain.handle("pods:contextMenu", (event, payload) => {
  const podName = String(payload?.podName ?? "").trim();
  const namespace = String(payload?.namespace ?? "").trim();
  if (!isValidPodContextTarget(podName, namespace)) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const kubectlBin = getEffectiveConfig().kubernetes.bin;

  const template = [
    {
      label: "Shell in Terminal (kubectl exec -it /bin/sh)",
      click: () =>
        launchDockerInTerminal({
          dockerBin: kubectlBin,
          dockerArgs: ["exec", "-it", podName, "-n", namespace, "--", "/bin/sh"],
        }),
    },
    {
      label: "Tail logs in Terminal",
      click: () =>
        launchDockerInTerminal({
          dockerBin: kubectlBin,
          dockerArgs: ["logs", "-f", "--tail", "200", "-n", namespace, podName],
        }),
    },
    { type: "separator" },
    {
      label: "Stop pod (kubectl delete)…",
      click: async () => {
        const { response } = await dialog.showMessageBox(win, {
          type: "warning",
          buttons: ["Cancel", "Delete"],
          defaultId: 0,
          cancelId: 0,
          message: "Stop this pod?",
          detail: `Runs: kubectl delete pod -n ${namespace} ${podName}\n\nControllers (Deployment, Job, etc.) may immediately create a replacement pod.`,
        });
        if (response !== 1) return;
        const r = await kubernetes.deletePod(podName, namespace);
        if (r.ok) {
          sendKubernetesMutation(win);
        } else {
          await dialog.showMessageBox(win, {
            type: "error",
            title: "kubectl delete pod failed",
            message: r.stderr?.trim() || `Exit code ${r.code ?? "?"}`,
          });
        }
      },
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  const popupOpts = { window: win };
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    popupOpts.x = Math.round(x);
    popupOpts.y = Math.round(y);
  }
  menu.popup(popupOpts);
});

/**
 * Native context menu for a Kubernetes Service row: port-forward + aggregate logs (`kubectl`).
 */
ipcMain.handle("services:contextMenu", (event, payload) => {
  const serviceName = String(payload?.serviceName ?? "").trim();
  const namespace = String(payload?.namespace ?? "").trim();
  if (!isValidKubernetesSubdomainName(serviceName) || !isValidKubernetesSubdomainName(namespace)) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const kubectlBin = getEffectiveConfig().kubernetes.bin;
  const rawPorts = payload?.ports;
  const ports = Array.isArray(rawPorts) ? rawPorts.slice(0, 48) : [];

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [];

  for (const entry of ports) {
    const port = Number(entry?.port);
    if (!isValidK8sTcpPort(port)) continue;
    const pname = entry?.name != null ? String(entry.name).trim() : "";
    const label = pname
      ? `Port-forward ${port}:${port} (${pname.slice(0, 24)})`
      : `Port-forward ${port}:${port}`;
    template.push({
      label,
      click: () =>
        launchDockerInTerminal({
          dockerBin: kubectlBin,
          dockerArgs: ["port-forward", "-n", namespace, `svc/${serviceName}`, `${port}:${port}`],
        }),
    });
  }

  if (!template.length) {
    template.push({ label: "No forwardable TCP ports", enabled: false });
  }

  const logsLabelArg = buildServiceLogsLabelSelector(payload?.logSelector);
  template.push({ type: "separator" });
  if (logsLabelArg) {
    template.push({
      label: "Tail logs in Terminal (pods behind service)",
      click: () =>
        launchDockerInTerminal({
          dockerBin: kubectlBin,
          dockerArgs: [
            "logs",
            "-f",
            "--tail",
            "200",
            "-n",
            namespace,
            "-l",
            logsLabelArg,
            "--prefix=true",
            "--all-containers=true",
            "--max-log-requests=20",
          ],
        }),
    });
  } else {
    template.push({
      label: "Tail logs (Service has no usable pod selector)",
      enabled: false,
    });
  }

  template.push({ type: "separator" });
  template.push({
    label: "Stop service (kubectl delete)…",
    click: async () => {
      const { response } = await dialog.showMessageBox(win, {
        type: "warning",
        buttons: ["Cancel", "Delete"],
        defaultId: 0,
        cancelId: 0,
        message: "Delete this Service?",
        detail: `Runs: kubectl delete service -n ${namespace} ${serviceName}\n\nPods behind the Service are not deleted; only routing and the Service object are removed.`,
      });
      if (response !== 1) return;
      const r = await kubernetes.deleteService(serviceName, namespace);
      if (r.ok) {
        sendKubernetesMutation(win);
      } else {
        await dialog.showMessageBox(win, {
          type: "error",
          title: "kubectl delete service failed",
          message: r.stderr?.trim() || `Exit code ${r.code ?? "?"}`,
        });
      }
    },
  });

  const menu = Menu.buildFromTemplate(template);
  const popupOpts = { window: win };
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    popupOpts.x = Math.round(x);
    popupOpts.y = Math.round(y);
  }
  menu.popup(popupOpts);
});

/**
 * Native context menu for an image row; remove runs `docker rmi -f`.
 */
ipcMain.handle("images:contextMenu", (event, payload) => {
  const imageId = String(payload?.imageId ?? "").trim();
  if (!isValidDockerImageId(imageId)) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const template = [
    {
      label: "Remove image…",
      click: async () => {
        const { response } = await dialog.showMessageBox(win, {
          type: "warning",
          buttons: ["Cancel", "Remove"],
          defaultId: 0,
          cancelId: 0,
          message: "Remove this image?",
          detail: `Runs: docker rmi -f\n\nID: ${imageId}`,
        });
        if (response !== 1) return;
        const r = await docker.removeImage(imageId);
        if (r.ok) {
          sendDockerMutation(win);
        } else {
          await dialog.showMessageBox(win, {
            type: "error",
            title: "docker rmi failed",
            message: r.stderr?.trim() || `Exit code ${r.code ?? "?"}`,
          });
        }
      },
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  const popupOpts = { window: win };
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    popupOpts.x = Math.round(x);
    popupOpts.y = Math.round(y);
  }
  menu.popup(popupOpts);
});

/**
 * Native context menu for a volume row; remove runs `docker volume rm -f`.
 */
ipcMain.handle("volumes:contextMenu", (event, payload) => {
  const volumeName = String(payload?.volumeName ?? "").trim();
  if (!isValidDockerVolumeName(volumeName)) {
    return;
  }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const template = [
    {
      label: "Remove volume…",
      click: async () => {
        const { response } = await dialog.showMessageBox(win, {
          type: "warning",
          buttons: ["Cancel", "Remove"],
          defaultId: 0,
          cancelId: 0,
          message: "Remove this volume?",
          detail: `Runs: docker volume rm -f\n\nName: ${volumeName}`,
        });
        if (response !== 1) return;
        const r = await docker.removeVolume(volumeName);
        if (r.ok) {
          sendDockerMutation(win);
        } else {
          await dialog.showMessageBox(win, {
            type: "error",
            title: "docker volume rm failed",
            message: r.stderr?.trim() || `Exit code ${r.code ?? "?"}`,
          });
        }
      },
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  const popupOpts = { window: win };
  const x = Number(payload?.x);
  const y = Number(payload?.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    popupOpts.x = Math.round(x);
    popupOpts.y = Math.round(y);
  }
  menu.popup(popupOpts);
});

ipcMain.handle("kubernetes:getNodes", () => kubernetes.getNodes());
ipcMain.handle("kubernetes:getPods", () => kubernetes.getPods());
ipcMain.handle("kubernetes:getGateways", () => kubernetes.getGateways());
ipcMain.handle("kubernetes:getVirtualServices", () => kubernetes.getVirtualServices());
ipcMain.handle("kubernetes:getServices", (_e, opts) => kubernetes.getServices(opts ?? {}));
