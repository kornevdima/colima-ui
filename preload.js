const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("colimaUi", {
  colimaList: () => ipcRenderer.invoke("colima:list"),
  colimaStatus: (profile) => ipcRenderer.invoke("colima:status", profile),
  colimaStart: (options) => ipcRenderer.invoke("colima:start", options ?? {}),
  colimaStop: (options) => ipcRenderer.invoke("colima:stop", options ?? {}),
  colimaVersion: () => ipcRenderer.invoke("colima:version"),
  colimaUiDefaults: () => ipcRenderer.invoke("colima:uiDefaults"),
  colimaTemplate: () => ipcRenderer.invoke("colima:template"),
  colimaTemplateEditInTerminal: () => ipcRenderer.invoke("colima:templateEditInTerminal"),
  dockerInfo: () => ipcRenderer.invoke("docker:info"),
  dockerPs: (options) => ipcRenderer.invoke("docker:ps", options ?? {}),
  dockerImages: (options) => ipcRenderer.invoke("docker:images", options ?? {}),
  dockerVolumes: (options) => ipcRenderer.invoke("docker:volumes", options ?? {}),
  dockerNetworks: (options) => ipcRenderer.invoke("docker:networks", options ?? {}),
  dockerVersion: () => ipcRenderer.invoke("docker:version"),
  kubernetesGetNodes: () => ipcRenderer.invoke("kubernetes:getNodes"),
  kubernetesGetPods: () => ipcRenderer.invoke("kubernetes:getPods"),
  kubernetesGetGateways: () => ipcRenderer.invoke("kubernetes:getGateways"),
  kubernetesGetVirtualServices: () =>
    ipcRenderer.invoke("kubernetes:getVirtualServices"),
  openContainerContextMenu: (payload) =>
    ipcRenderer.invoke("containers:contextMenu", payload ?? {}),
  openImageContextMenu: (payload) =>
    ipcRenderer.invoke("images:contextMenu", payload ?? {}),
  openVolumeContextMenu: (payload) =>
    ipcRenderer.invoke("volumes:contextMenu", payload ?? {}),
  commandLogGet: () => ipcRenderer.invoke("command-log:get"),
  commandLogClear: () => ipcRenderer.invoke("command-log:clear"),
  onCommandLogAppend: (callback) => {
    const channel = "command-log:append";
    const handler = (_e, entry) => {
      try {
        callback(entry);
      } catch {
        /* ignore */
      }
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onCommandLogCleared: (callback) => {
    const channel = "command-log:cleared";
    const handler = () => {
      try {
        callback();
      } catch {
        /* ignore */
      }
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  onDockerMutation: (callback) => {
    const channel = "docker:mutation";
    const handler = () => {
      try {
        callback();
      } catch {
        /* ignore */
      }
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
