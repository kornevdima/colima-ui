const { spawn } = require("child_process");

/**
 * Escape a string for use inside AppleScript `do script "..."` double-quoted segment.
 * @param {string} s
 */
function escapeAppleScriptDoubleQuoted(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Quote argv piece for POSIX shell single-quoted string.
 * @param {string} s
 */
function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/**
 * Build a POSIX shell command with single-quoted argv (bash -lc).
 * @param {string} dockerBin
 * @param {string[]} dockerArgs
 */
function dockerCommandLinePosix(dockerBin, dockerArgs) {
  const parts = [dockerBin, ...dockerArgs].map((p) => shellSingleQuote(String(p)));
  return parts.join(" ");
}

/**
 * @param {string} s
 */
function winQuoteArg(s) {
  const t = String(s);
  if (!/[\s"&]/.test(t)) return t;
  return `"${t.replace(/"/g, '\\"')}"`;
}

/**
 * Build a `cmd.exe` command line for `docker …`.
 * @param {string} dockerBin
 * @param {string[]} dockerArgs
 */
function dockerCommandLineWin32(dockerBin, dockerArgs) {
  return [winQuoteArg(dockerBin), ...dockerArgs.map(winQuoteArg)].join(" ");
}

/**
 * Open the default terminal and run a docker command (attach, exec, …).
 * Does not wait for the session to finish.
 * @param {{ dockerBin: string; dockerArgs: string[] }} opts
 */
function launchDockerInTerminal(opts) {
  const { dockerBin, dockerArgs } = opts;

  if (process.platform === "darwin") {
    const line = dockerCommandLinePosix(dockerBin, dockerArgs);
    const inner = escapeAppleScriptDoubleQuoted(line);
    const script = `tell application "Terminal" to do script "${inner}"`;
    const child = spawn("osascript", ["-e", script], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  if (process.platform === "win32") {
    const line = dockerCommandLineWin32(dockerBin, dockerArgs);
    const child = spawn("cmd.exe", ["/c", "start", "", "cmd", "/k", line], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return;
  }

  const line = dockerCommandLinePosix(dockerBin, dockerArgs);
  const bashLine = `${line}; exec bash`;
  const custom = process.env.COLIMA_UI_TERMINAL_LINUX || process.env.TERMINAL;
  if (custom) {
    const child = spawn(custom, ["-e", "bash", "-lc", bashLine], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }
  const shCmd = `if command -v gnome-terminal >/dev/null 2>&1; then exec gnome-terminal -- bash -lc ${JSON.stringify(
    bashLine
  )}; elif command -v x-terminal-emulator >/dev/null 2>&1; then exec x-terminal-emulator -e bash -lc ${JSON.stringify(
    bashLine
  )}; else exec bash -lc ${JSON.stringify(bashLine)}; fi`;
  const child = spawn("sh", ["-c", shCmd], { detached: true, stdio: "ignore" });
  child.unref();
}

module.exports = { launchDockerInTerminal };
