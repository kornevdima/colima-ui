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
  dockerVersion: () => ipcRenderer.invoke("docker:version"),
  kubernetesGetNodes: () => ipcRenderer.invoke("kubernetes:getNodes"),
  openContainerContextMenu: (payload) =>
    ipcRenderer.invoke("containers:contextMenu", payload ?? {}),
  openImageContextMenu: (payload) =>
    ipcRenderer.invoke("images:contextMenu", payload ?? {}),
  openVolumeContextMenu: (payload) =>
    ipcRenderer.invoke("volumes:contextMenu", payload ?? {}),
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
