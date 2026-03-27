const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require("electron");
const path = require("path");
const { config } = require("./lib/config");
const { createLogger } = require("./lib/logger");
const { createColimaOperations } = require("./domain/colima/colima-operations");
const { createDockerOperations } = require("./domain/docker/docker-operations");
const { createKubernetesOperations } = require("./domain/kubernetes/kubernetes-operations");
const { launchDockerInTerminal } = require("./lib/terminal-launch");
const {
  isValidContainerId,
  isValidDockerImageId,
  isValidDockerVolumeName,
} = require("./lib/docker-identifiers");

const log = createLogger(config.logging);
const colima = createColimaOperations({ config, log });
const docker = createDockerOperations({ config, log });
const kubernetes = createKubernetesOperations({ config, log });

/** After successful `docker rm` / `rmi` / `volume rm`, tell renderer to refresh. */
function sendDockerMutation(win) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("docker:mutation");
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
  log.info("app.ready", { colimaBin: config.colima.bin, dockerBin: config.docker.bin });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("colima:list", () => colima.listInstances());
ipcMain.handle("colima:status", (_e, profile) => colima.getStatus(profile));
ipcMain.handle("colima:start", (_e, options) => colima.start(options ?? {}));
ipcMain.handle("colima:stop", (_e, options) => colima.stop(options ?? {}));
ipcMain.handle("colima:version", () => colima.getVersion());

ipcMain.handle("docker:info", () => docker.getInfo());
ipcMain.handle("docker:ps", (_e, options) => docker.listContainers(options ?? {}));
ipcMain.handle("docker:images", (_e, options) => docker.listImages(options ?? {}));
ipcMain.handle("docker:volumes", (_e, options) => docker.listVolumes(options ?? {}));
ipcMain.handle("docker:version", () => docker.getVersion());

/**
 * Native context menu for a container row; attach/exec use the system terminal; remove runs `docker rm -f`.
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

  const dockerBin = config.docker.bin;
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

/** Reserved for UI; returns stub unless `COLIMA_UI_K8S_ENABLED=1`. */
ipcMain.handle("kubernetes:getNodes", () => kubernetes.getNodes());
