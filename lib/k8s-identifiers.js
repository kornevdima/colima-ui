/**
 * Validate pod name / namespace from the renderer before passing argv to kubectl.
 * Mirrors Kubernetes DNS subdomain / label rules closely enough for UI-sourced IDs.
 */

/** DNS label: alphanumeric + hyphen; 1–63 chars; must start/end with alphanumeric. */
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/i;

const MAX_SUBDOMAIN_LEN = 253;

/**
 * @param {string} s
 * @returns {boolean}
 */
function isValidKubernetesSubdomainName(s) {
  const t = String(s ?? "").trim();
  if (!t || t.length > MAX_SUBDOMAIN_LEN) return false;
  const labels = t.split(".");
  for (const part of labels) {
    if (!part || part.length > 63 || !DNS_LABEL.test(part)) return false;
  }
  return true;
}

/**
 * @param {string} name
 * @param {string} namespace
 * @returns {boolean}
 */
function isValidPodContextTarget(name, namespace) {
  return isValidKubernetesSubdomainName(name) && isValidKubernetesSubdomainName(namespace);
}

/**
 * @param {unknown} p
 * @returns {boolean}
 */
function isValidK8sTcpPort(p) {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

/**
 * One key=value piece for `kubectl logs -l` (comma-joined). Rejects commas / whitespace in keys or values.
 * @param {string} k
 * @param {string} v
 */
function isSafeLogsSelectorPair(k, v) {
  const ks = String(k);
  const vs = String(v);
  if (!ks || ks.length > 253 || vs.length > 63) return false;
  if (/[,\s\r\n]/.test(ks) || /[,\s\r\n]/.test(vs)) return false;
  return /^[a-zA-Z0-9._/-]+$/.test(ks) && (vs === "" || /^[a-zA-Z0-9._-]+$/.test(vs));
}

/**
 * Build `-l` argument for `kubectl logs` from a Service `spec.selector` object.
 * Skips invalid entries; returns null if nothing usable remains.
 * @param {unknown} obj
 * @returns {string | null}
 */
function buildServiceLogsLabelSelector(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const pairs = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const ks = String(k);
    const vs = String(v);
    if (!isSafeLogsSelectorPair(ks, vs)) continue;
    pairs.push(`${ks}=${vs}`);
  }
  if (!pairs.length) return null;
  return pairs.join(",");
}

module.exports = {
  isValidKubernetesSubdomainName,
  isValidPodContextTarget,
  isValidK8sTcpPort,
  buildServiceLogsLabelSelector,
};
