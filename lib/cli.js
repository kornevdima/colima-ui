const { execFile } = require("child_process");

/** @type {((meta: Record<string, unknown>) => void) | null} */
let afterRunHook = null;

/**
 * Called after every `runBinary` completes (success or failure). For audit / UI logs.
 * @param {((meta: Record<string, unknown>) => void) | null} fn
 */
function setAfterRunHook(fn) {
  afterRunHook = fn === null || typeof fn === "function" ? fn : null;
}

const STDERR_LOG_CAP = 4_000;

/**
 * @param {string} s
 * @param {number} max
 */
function truncate(s, max) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: boolean; code: number | null; stdout: string; stderr: string; error?: string }>}
 */
function runBinary(cmd, args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const started = Date.now();
  const argCopy = Array.isArray(args) ? [...args] : [];
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env },
      },
      (err, stdout, stderr) => {
        const out = stdout?.toString() ?? "";
        const errOut = stderr?.toString() ?? "";
        let result;
        if (err) {
          const code = typeof err.code === "number" ? err.code : null;
          result = {
            ok: false,
            code,
            stdout: out,
            stderr: errOut || String(err.message || err),
            error: err.killed ? "Command timed out" : undefined,
          };
        } else {
          result = { ok: true, code: 0, stdout: out, stderr: errOut };
        }

        if (afterRunHook) {
          try {
            afterRunHook({
              ts: new Date().toISOString(),
              bin: cmd,
              args: argCopy,
              ok: result.ok,
              code: result.code,
              stderr: truncate(result.stderr, STDERR_LOG_CAP),
              stdoutBytes: Buffer.byteLength(out, "utf8"),
              error: result.error,
              durationMs: Date.now() - started,
            });
          } catch {
            /* never break CLI path */
          }
        }

        resolve(result);
      }
    );
  });
}

module.exports = { runBinary, setAfterRunHook };
