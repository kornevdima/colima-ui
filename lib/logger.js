/**
 * Logs to stdout (stream), one line per event — aligns with twelve-factor "logs" factor
 * for the main process. Renderer remains separate (DevTools / future IPC log sink).
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * @param {(() => { level: string }) | { level: string }} loggingConfigOrGetter
 */
function createLogger(loggingConfigOrGetter) {
  function minLevel() {
    const cfg = typeof loggingConfigOrGetter === "function" ? loggingConfigOrGetter() : loggingConfigOrGetter;
    return LEVELS[cfg.level] ?? LEVELS.info;
  }

  function emit(level, msg, meta) {
    if (LEVELS[level] > minLevel()) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...meta,
    });
    if (level === "error") console.error(line);
    else console.log(line);
  }

  return {
    error: (msg, meta) => emit("error", msg, meta),
    warn: (msg, meta) => emit("warn", msg, meta),
    info: (msg, meta) => emit("info", msg, meta),
    debug: (msg, meta) => emit("debug", msg, meta),
  };
}

module.exports = { createLogger };
