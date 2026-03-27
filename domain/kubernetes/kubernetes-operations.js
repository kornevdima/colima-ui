/**
 * Domain: Kubernetes cluster visibility via kubectl (read-only lists).
 * Istio CRDs use full API names to avoid clashing with Gateway API.
 */

const { runBinary } = require("../../lib/cli");

/**
 * @param {string} stdout
 * @returns {{ items: Record<string, unknown>[]; parseError?: string }}
 */
function parseKubectlListJson(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return { items: [] };
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j.items)) return { items: j.items };
    return { items: [], parseError: "response has no items array" };
  } catch (e) {
    return { items: [], parseError: String(e.message || e) };
  }
}

/** @param {{ config: object, log: object }} deps */
function createKubernetesOperations(deps) {
  const { config, log } = deps;
  const bin = config.kubernetes.bin;
  const short = config.timeouts.shortMs;

  function skipResponse() {
    return {
      ok: true,
      code: 0,
      stdout: "",
      stderr: "",
      items: [],
      skipped: true,
    };
  }

  async function getNodes() {
    if (!config.kubernetes.enabled) {
      log.debug("kubernetes.getNodes.skipped", { reason: "COLIMA_UI_K8S_ENABLED=0" });
      return skipResponse();
    }
    log.debug("kubernetes.getNodes", { bin });
    const r = await runBinary(bin, ["get", "nodes", "-o", "json"], { timeoutMs: short });
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  async function getPods() {
    if (!config.kubernetes.enabled) {
      return skipResponse();
    }
    log.debug("kubernetes.getPods", { bin });
    const r = await runBinary(bin, ["get", "pods", "-A", "-o", "json"], { timeoutMs: short });
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  async function getGateways() {
    if (!config.kubernetes.enabled) {
      return skipResponse();
    }
    log.debug("kubernetes.getGateways", { bin });
    const r = await runBinary(
      bin,
      ["get", "gateway.networking.istio.io", "-A", "-o", "json"],
      { timeoutMs: short }
    );
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  async function getVirtualServices() {
    if (!config.kubernetes.enabled) {
      return skipResponse();
    }
    log.debug("kubernetes.getVirtualServices", { bin });
    const r = await runBinary(
      bin,
      ["get", "virtualservice.networking.istio.io", "-A", "-o", "json"],
      { timeoutMs: short }
    );
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  return {
    getNodes,
    getPods,
    getGateways,
    getVirtualServices,
    isEnabled: () => config.kubernetes.enabled,
  };
}

module.exports = { createKubernetesOperations };
