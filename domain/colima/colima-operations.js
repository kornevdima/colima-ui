/**
 * Domain: Colima lifecycle and instance visibility.
 * All Colima side-effects and parsing live here — separate from Docker and Kubernetes.
 */

const fs = require("fs").promises;
const nodePath = require("path");
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

const RUNTIMES = new Set(["docker", "containerd", "incus"]);
const VM_TYPES = new Set(["qemu", "vz", "krunkit"]);

function clampIntStr(raw, fallback, min, max) {
  const n = Number.parseInt(String(raw ?? fallback), 10);
  if (!Number.isFinite(n)) return String(fallback);
  return String(Math.min(max, Math.max(min, n)));
}

function clampFloatStr(raw, fallback, min, max) {
  const n = Number.parseFloat(String(raw ?? fallback));
  if (!Number.isFinite(n)) return String(fallback);
  const x = Math.min(max, Math.max(min, n));
  return String(x);
}

function pickRuntime(raw, fallback) {
  const s = String(raw ?? fallback ?? "docker").trim().toLowerCase();
  return RUNTIMES.has(s) ? s : String(fallback);
}

function pickVmType(raw, fallback) {
  const s = String(raw ?? fallback ?? "vz").trim().toLowerCase();
  return VM_TYPES.has(s) ? s : String(fallback);
}

/** Allow only a k3s-style version tag (no shell metacharacters). */
function sanitizeKubernetesVersion(s) {
  const t = String(s ?? "").trim();
  if (!t || t.length > 80) return "";
  if (!/^v[\w.+-]+$/i.test(t)) return "";
  return t;
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

  /**
   * @param {{
   *   profile?: string;
   *   preset?: null | "kubernetes";
   *   startOptions?: Record<string, unknown>;
   * }} [options]
   */
  async function start(options = {}) {
    const { profile, preset } = options;
    const raw =
      options.startOptions && typeof options.startOptions === "object"
        ? options.startOptions
        : {};
    const args = ["start"];

    if (preset === "kubernetes") {
      const k = config.colima.startKubernetes;
      const cpu = clampIntStr(raw.cpu, k.cpu, 1, 128);
      const memory = clampFloatStr(raw.memoryGiB, k.memoryGiB, 0.5, 512);
      const disk = clampIntStr(raw.diskGiB, k.diskGiB, 10, 2000);
      args.push("--cpu", cpu, "--memory", memory, "--disk", disk, "--kubernetes");
      const kVer = sanitizeKubernetesVersion(raw.kubernetesVersion ?? k.kubernetesVersion);
      if (kVer) args.push("--kubernetes-version", kVer);
    } else {
      const d = config.colima.startDefaults;
      const cpu = clampIntStr(raw.cpu, d.cpu, 1, 128);
      const memory = clampFloatStr(raw.memoryGiB, d.memoryGiB, 0.5, 512);
      const disk = clampIntStr(raw.diskGiB, d.diskGiB, 10, 2000);
      const runtime = pickRuntime(raw.runtime, d.runtime);
      const vmType = pickVmType(raw.vmType, d.vmType);
      args.push("--cpu", cpu, "--memory", memory, "--disk", disk, "--runtime", runtime, "--vm-type", vmType);
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

  /**
   * `colima template --print` then read file contents for display.
   * @returns {Promise<object & { path: string | null; content: string | null; readError: string | null }>}
   */
  async function getTemplate() {
    log.debug("colima.getTemplate", { bin });
    const r = await runBinary(bin, ["template", "--print"], { timeoutMs: short });
    const filePath = r.stdout.trim().split(/\r?\n/)[0]?.trim() ?? "";
    if (!r.ok) {
      return { ...r, path: null, content: null, readError: null };
    }
    if (!filePath || !nodePath.isAbsolute(filePath) || /[\0\r\n]/.test(filePath)) {
      return {
        ...r,
        path: filePath || null,
        content: null,
        readError: "unexpected template path from colima",
      };
    }
    try {
      const content = await fs.readFile(filePath, "utf8");
      return { ...r, path: filePath, content, readError: null };
    } catch (e) {
      return {
        ...r,
        path: filePath,
        content: null,
        readError: String(e.message || e),
      };
    }
  }

  return {
    listInstances,
    getStatus,
    start,
    stop,
    getVersion,
    getTemplate,
  };
}

module.exports = { createColimaOperations };
