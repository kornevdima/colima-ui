const { execFile } = require("child_process");

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<{ ok: boolean; code: number | null; stdout: string; stderr: string; error?: string }>}
 */
function runBinary(cmd, args, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 60_000;
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
        if (err) {
          const code = typeof err.code === "number" ? err.code : null;
          resolve({
            ok: false,
            code,
            stdout: out,
            stderr: errOut || String(err.message || err),
            error: err.killed ? "Command timed out" : undefined,
          });
          return;
        }
        resolve({ ok: true, code: 0, stdout: out, stderr: errOut });
      }
    );
  });
}

module.exports = { runBinary };
