/**
 * Domain: Colima lifecycle and instance visibility.
 * All Colima side-effects and parsing live here — separate from Docker and Kubernetes.
 */

const { runBinary } = require("../../lib/cli");

/**
 * @param {string} stdout
 * @returns {Record<string, unknown>[]}
 */
function parseColimaListJson(stdout) {
  const text = stdout.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  }
}

/** @param {{ config: object, log: object }} deps */
function createColimaOperations(deps) {
  const { config, log } = deps;
  const bin = config.colima.bin;
  const short = config.timeouts.shortMs;
  const long = config.timeouts.longMs;

  async function listInstances() {
    log.debug("colima.listInstances", { bin });
    const r = await runBinary(bin, ["list", "-j"], { timeoutMs: short });
    if (!r.stdout.trim()) {
      return { ...r, instances: [] };
    }
    try {
      const instances = parseColimaListJson(r.stdout);
      return { ...r, instances, parseError: null };
    } catch (e) {
      log.warn("colima.listInstances.parse_failed", { message: String(e.message || e) });
      return { ...r, instances: [], parseError: String(e.message || e) };
    }
  }

  async function getStatus(profile) {
    const args = ["status", "-j"];
    if (profile) args.push(profile);
    log.debug("colima.getStatus", { bin, profile: profile ?? null });
    const r = await runBinary(bin, args, { timeoutMs: short });
    let status = null;
    if (r.stdout.trim()) {
      try {
        status = JSON.parse(r.stdout);
      } catch {
        /* keep null */
      }
    }
    return { ...r, status };
  }

  async function start(options = {}) {
    const { profile, preset } = options;
    const args = ["start"];
    if (preset === "kubernetes") {
      const { cpu, memoryGiB } = config.colima.startKubernetes;
      args.push("--cpu", cpu, "--memory", memoryGiB, "--kubernetes");
    }
    if (profile) args.push("-p", profile);
    log.info("colima.start", { profile: profile ?? null, preset: preset ?? null });
    return runBinary(bin, args, { timeoutMs: long });
  }

  async function stop(options = {}) {
    const { profile } = options;
    const args = ["stop"];
    if (profile) args.push("-p", profile);
    log.info("colima.stop", { profile: profile ?? null });
    return runBinary(bin, args, { timeoutMs: long });
  }

  async function getVersion() {
    log.debug("colima.getVersion", { bin });
    return runBinary(bin, ["version"], { timeoutMs: short });
  }

  return {
    listInstances,
    getStatus,
    start,
    stop,
    getVersion,
  };
}

module.exports = { createColimaOperations };
