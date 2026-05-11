/**
 * Domain: Kubernetes via kubectl (list resources; delete pod / service from context menus).
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

/** @param {{ getConfig: () => object, log: object }} deps */
function createKubernetesOperations(deps) {
  const { getConfig, log } = deps;

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
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const short = cfg.timeouts.shortMs;
    if (!cfg.kubernetes.enabled) {
      log.debug("kubernetes.getNodes.skipped", { reason: "COLIMA_UI_K8S_ENABLED=0" });
      return skipResponse();
    }
    log.debug("kubernetes.getNodes", { bin });
    const r = await runBinary(bin, ["get", "nodes", "-o", "json"], { timeoutMs: short });
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  async function getPods() {
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const short = cfg.timeouts.shortMs;
    if (!cfg.kubernetes.enabled) {
      return skipResponse();
    }
    log.debug("kubernetes.getPods", { bin });
    const r = await runBinary(bin, ["get", "pods", "-A", "-o", "json"], { timeoutMs: short });
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return { ...r, items, parseError: r.ok ? parseError : undefined };
  }

  async function getGateways() {
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const short = cfg.timeouts.shortMs;
    if (!cfg.kubernetes.enabled) {
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
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const short = cfg.timeouts.shortMs;
    if (!cfg.kubernetes.enabled) {
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

  /**
   * @param {{ listNamespaceOverride?: string | null }} [options]
   * `listNamespaceOverride`: `null`/`undefined` → use config; `""` → `-A`; else `-n <value>`.
   */
  async function getServices(options = {}) {
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const short = cfg.timeouts.shortMs;
    if (!cfg.kubernetes.enabled) {
      return skipResponse();
    }
    const raw = options.listNamespaceOverride;
    const ns =
      raw === undefined || raw === null ? cfg.kubernetes.servicesNamespace : String(raw).trim();
    const svcArgs =
      ns === "" ? ["get", "svc", "-A", "-o", "json"] : ["get", "svc", "-n", ns, "-o", "json"];
    log.debug("kubernetes.getServices", { bin, namespace: ns || "(all)" });
    const r = await runBinary(bin, svcArgs, { timeoutMs: short });
    const { items, parseError } = parseKubectlListJson(r.ok ? r.stdout : "");
    return {
      ...r,
      items,
      parseError: r.ok ? parseError : undefined,
      servicesListNamespace: ns === "" ? "(all)" : ns,
    };
  }

  /**
   * @param {string} name
   * @param {string} namespace
   */
  async function deletePod(name, namespace) {
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const long = cfg.timeouts.longMs;
    log.info("kubernetes.deletePod", { name, namespace });
    return runBinary(bin, ["delete", "pod", name, "-n", namespace], { timeoutMs: long });
  }

  /**
   * @param {string} name
   * @param {string} namespace
   */
  async function deleteService(name, namespace) {
    const cfg = getConfig();
    const bin = cfg.kubernetes.bin;
    const long = cfg.timeouts.longMs;
    log.info("kubernetes.deleteService", { name, namespace });
    return runBinary(bin, ["delete", "service", name, "-n", namespace], { timeoutMs: long });
  }

  return {
    getNodes,
    getPods,
    getGateways,
    getVirtualServices,
    getServices,
    deletePod,
    deleteService,
    isEnabled: () => getConfig().kubernetes.enabled,
  };
}

module.exports = { createKubernetesOperations };
