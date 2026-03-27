/**
 * Domain: Kubernetes cluster visibility and control (future).
 * Interface is defined now so IPC and UI can plug in without reshaping Colima/Docker.
 */

const { runBinary } = require("../../lib/cli");

const NOT_IMPLEMENTED = Object.freeze({
  ok: false,
  code: null,
  stdout: "",
  stderr: "Kubernetes operations are not implemented yet.",
  notImplemented: true,
});

/** @param {{ config: object, log: object }} deps */
function createKubernetesOperations(deps) {
  const { config, log } = deps;
  const bin = config.kubernetes.bin;
  const short = config.timeouts.shortMs;

  /**
   * Placeholder: will call `kubectl get nodes -o json` (or similar) when enabled.
   */
  async function getNodes() {
    if (!config.kubernetes.enabled) {
      log.debug("kubernetes.getNodes.skipped", { reason: "COLIMA_UI_K8S_ENABLED!=1" });
      return { ...NOT_IMPLEMENTED };
    }
    log.info("kubernetes.getNodes", { bin });
    return runBinary(bin, ["get", "nodes", "-o", "json"], { timeoutMs: short });
  }

  return {
    getNodes,
    isEnabled: () => config.kubernetes.enabled,
  };
}

module.exports = { createKubernetesOperations, NOT_IMPLEMENTED };
