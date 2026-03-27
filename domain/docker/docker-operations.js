/**
 * Domain: Docker engine visibility (info, containers, images, volumes, networks, version).
 * Separate bounded context from Colima; uses the Docker CLI as an attachable resource.
 */

const { runBinary } = require("../../lib/cli");

/**
 * @param {string[]} filters
 * @returns {string[]} flat `-f` args pairs as ['-f', line, ...]
 */
function expandDockerFilterArgs(filters) {
  const out = [];
  for (const f of filters) {
    const line = String(f).trim();
    if (!line || line.startsWith("-")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq);
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(key)) continue;
    out.push("-f", line);
  }
  return out;
}

/** @param {{ config: object, log: object }} deps */
function createDockerOperations(deps) {
  const { config, log } = deps;
  const bin = config.docker.bin;
  const short = config.timeouts.shortMs;

  async function getInfo() {
    log.debug("docker.getInfo", { bin });
    const r = await runBinary(bin, ["info", "--format", "{{json .}}"], {
      timeoutMs: short,
    });
    let info = null;
    if (r.stdout.trim()) {
      try {
        info = JSON.parse(r.stdout);
      } catch {
        /* ignore */
      }
    }
    return { ...r, info };
  }

  /**
   * @param {{ filters?: string[] }} [options]
   */
  async function listContainers(options = {}) {
    const raw = options.filters;
    const filters = Array.isArray(raw) ? raw : [];
    const args = ["ps", "-a", "--no-trunc", "--format", "{{json .}}"];
    args.push(...expandDockerFilterArgs(filters));
    log.debug("docker.listContainers", { bin, filterCount: filters.length });
    const r = await runBinary(bin, args, { timeoutMs: short });
    const lines = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const containers = [];
    for (const line of lines) {
      try {
        containers.push(JSON.parse(line));
      } catch {
        /* skip bad line */
      }
    }
    return { ...r, containers };
  }

  /**
   * `docker image ls` with optional `-f` filters (same as CLI). Each filter is `key=value`.
   * @param {{ filters?: string[] }} [options]
   */
  async function listImages(options = {}) {
    const raw = options.filters;
    const filters = Array.isArray(raw) ? raw : [];
    const args = ["image", "ls", "-a", "--no-trunc", "--format", "{{json .}}"];
    args.push(...expandDockerFilterArgs(filters));
    log.debug("docker.listImages", { bin, filterCount: filters.length });
    const r = await runBinary(bin, args, { timeoutMs: short });
    const lines = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const images = [];
    for (const line of lines) {
      try {
        images.push(JSON.parse(line));
      } catch {
        /* skip bad line */
      }
    }
    return { ...r, images };
  }

  async function getVersion() {
    log.debug("docker.getVersion", { bin });
    return runBinary(bin, ["version", "--format", "{{json .}}"], {
      timeoutMs: short,
    });
  }

  async function removeContainer(containerId) {
    log.info("docker.removeContainer", { id: String(containerId).slice(0, 14) });
    return runBinary(bin, ["rm", "-f", containerId], { timeoutMs: short });
  }

  async function removeImage(imageId) {
    log.info("docker.removeImage", { id: String(imageId).slice(0, 22) });
    return runBinary(bin, ["rmi", "-f", imageId], { timeoutMs: short });
  }

  /**
   * `docker volume ls` with optional `-f` filters (same pattern as image/container lists).
   * @param {{ filters?: string[] }} [options]
   */
  async function listVolumes(options = {}) {
    const raw = options.filters;
    const filters = Array.isArray(raw) ? raw : [];
    const args = ["volume", "ls", "--format", "{{json .}}"];
    args.push(...expandDockerFilterArgs(filters));
    log.debug("docker.listVolumes", { bin, filterCount: filters.length });
    const r = await runBinary(bin, args, { timeoutMs: short });
    const lines = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const volumes = [];
    for (const line of lines) {
      try {
        volumes.push(JSON.parse(line));
      } catch {
        /* skip bad line */
      }
    }
    return { ...r, volumes };
  }

  async function removeVolume(volumeName) {
    log.info("docker.removeVolume", { name: String(volumeName).slice(0, 32) });
    return runBinary(bin, ["volume", "rm", "-f", volumeName], { timeoutMs: short });
  }

  /**
   * `docker network ls` with optional `-f` filters.
   * @param {{ filters?: string[] }} [options]
   */
  async function listNetworks(options = {}) {
    const raw = options.filters;
    const filters = Array.isArray(raw) ? raw : [];
    const args = ["network", "ls", "--no-trunc", "--format", "{{json .}}"];
    args.push(...expandDockerFilterArgs(filters));
    log.debug("docker.listNetworks", { bin, filterCount: filters.length });
    const r = await runBinary(bin, args, { timeoutMs: short });
    const lines = r.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const networks = [];
    for (const line of lines) {
      try {
        networks.push(JSON.parse(line));
      } catch {
        /* skip bad line */
      }
    }
    return { ...r, networks };
  }

  return {
    getInfo,
    listContainers,
    listImages,
    listVolumes,
    listNetworks,
    removeContainer,
    removeImage,
    removeVolume,
    getVersion,
  };
}

module.exports = { createDockerOperations };
