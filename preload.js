const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("colimaUi", {
  colimaList: () => ipcRenderer.invoke("colima:list"),
  colimaStatus: (profile) => ipcRenderer.invoke("colima:status", profile),
  colimaStart: (options) => ipcRenderer.invoke("colima:start", options ?? {}),
  colimaStop: (options) => ipcRenderer.invoke("colima:stop", options ?? {}),
  colimaVersion: () => ipcRenderer.invoke("colima:version"),
  dockerInfo: () => ipcRenderer.invoke("docker:info"),
  dockerPs: (options) => ipcRenderer.invoke("docker:ps", options ?? {}),
  dockerImages: (options) => ipcRenderer.invoke("docker:images", options ?? {}),
  dockerVersion: () => ipcRenderer.invoke("docker:version"),
  kubernetesGetNodes: () => ipcRenderer.invoke("kubernetes:getNodes"),
  openContainerContextMenu: (payload) =>
    ipcRenderer.invoke("containers:contextMenu", payload ?? {}),
});
