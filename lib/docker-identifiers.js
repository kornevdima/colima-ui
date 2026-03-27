/**
 * Validate IDs passed from the renderer before shelling out to docker.
 * @param {string} id
 * @returns {boolean}
 */
function isValidContainerId(id) {
  return /^[a-f0-9]{12,128}$/i.test(String(id || "").trim());
}

/**
 * Image ID from `docker image ls` (hex or `sha256:` + 64 hex).
 * @param {string} id
 * @returns {boolean}
 */
function isValidDockerImageId(id) {
  const s = String(id || "").trim();
  if (/^[a-f0-9]{12,64}$/i.test(s)) return true;
  if (/^sha256:[a-f0-9]{64}$/i.test(s)) return true; // full digest from `docker image ls --no-trunc`
  return false;
}

/**
 * Volume name from `docker volume ls` (named volume or anonymous hex id).
 * @param {string} name
 * @returns {boolean}
 */
function isValidDockerVolumeName(name) {
  const s = String(name || "").trim();
  if (!s) return false;
  if (/^[a-f0-9]{64}$/i.test(s)) return true;
  return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(s);
}

module.exports = {
  isValidContainerId,
  isValidDockerImageId,
  isValidDockerVolumeName,
};
