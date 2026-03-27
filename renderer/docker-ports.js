/**
 * Parse `docker ps` **Ports** cell (e.g. `0.0.0.0:9002->9002/tcp, [::]:9002->9002/tcp`)
 * into `http://…` URLs for the host-side bindings.
 * @param {string} portsRaw
 * @returns {string[]}
 */
export function publishedHttpUrlsFromDockerPorts(portsRaw) {
  const s = String(portsRaw || "").trim();
  if (!s || s === "—") return [];

  const seen = new Set();
  const out = [];

  for (const chunk of s.split(",")) {
    const seg = chunk.trim();
    const arrow = seg.indexOf("->");
    if (arrow === -1) continue;
    const left = seg.slice(0, arrow).trim();
    const parsed = parseHostPortBinding(left);
    if (!parsed) continue;
    const url = hostPortToHttpUrl(parsed.host, parsed.port);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }

  /** One menu item per host port (`0.0.0.0:9002` and `[::]:9002` → same service). */
  const byPort = new Map();
  for (const url of out) {
    try {
      const port = new URL(url).port;
      if (port && !byPort.has(port)) byPort.set(port, url);
    } catch {
      /* skip */
    }
  }
  return Array.from(byPort.values());
}

/**
 * @param {string} left e.g. `0.0.0.0:9002`, `[::]:9002`, `127.0.0.1:8080`
 * @returns {{ host: string; port: string } | null}
 */
function parseHostPortBinding(left) {
  if (!left) return null;
  /** Bracketed IPv6: `[::]:9002`, `[2001:db8::1]:80` */
  const v6 = left.match(/^\[([^\]]+)]:(\d+)$/);
  if (v6) {
    return { host: v6[1].trim(), port: v6[2] };
  }
  const colon = left.lastIndexOf(":");
  if (colon <= 0) return null;
  const host = left.slice(0, colon).trim();
  const port = left.slice(colon + 1).trim();
  if (!host || !/^\d+$/.test(port)) return null;
  return { host, port };
}

/**
 * @param {string} host
 * @param {string} port
 * @returns {string | null}
 */
function hostPortToHttpUrl(host, port) {
  if (!/^\d{1,5}$/.test(port)) return null;
  const n = Number(port);
  if (n < 1 || n > 65535) return null;

  let h = host;
  if (h === "::" || h === "") {
    h = "localhost";
  }

  const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(h);
  const isV6 = !isV4 && h.includes(":");

  if (isV6) {
    return `http://[${h}]:${port}`;
  }
  return `http://${h}:${port}`;
}
