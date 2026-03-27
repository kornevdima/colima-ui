import { escapeHtml } from "./utils.js";

const CMD_PREVIEW = 96;

/**
 * @param {string} bin
 * @param {string[]} args
 */
function formatCommandLine(bin, args) {
  const parts = [String(bin || "")];
  for (const a of args || []) {
    const s = String(a);
    if (/[\s"'\\]/.test(s)) parts.push(JSON.stringify(s));
    else parts.push(s);
  }
  return parts.join(" ");
}

/**
 * @param {HTMLTableSectionElement} tbodyEl
 * @param {Record<string, unknown>[]} entries — oldest-first (as from main); shown newest-first
 */
export function renderCommandLogTable(tbodyEl, entries) {
  tbodyEl.innerHTML = "";
  const list = Array.isArray(entries) ? [...entries] : [];
  if (!list.length) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="5" class="empty">No commands yet — use Refresh or Colima/Docker actions.</td>';
    tbodyEl.appendChild(tr);
    return;
  }
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const e = list[i];
    const tr = document.createElement("tr");
    const ts = String(e.ts ?? "—");
    const bin = String(e.bin ?? "");
    const args = Array.isArray(e.args) ? e.args.map(String) : [];
    const fullCmd = formatCommandLine(bin, args);
    const cmdShort =
      fullCmd.length > CMD_PREVIEW ? `${fullCmd.slice(0, CMD_PREVIEW)}…` : fullCmd;
    const ok = Boolean(e.ok);
    const code = e.code;
    const exit = ok ? "0" : code != null ? String(code) : "—";
    const ms = e.durationMs != null ? String(e.durationMs) : "—";
    const errNote = e.error ? String(e.error) : "";
    const stderr = String(e.stderr || "").trim();
    const stderrOne = stderr.split("\n")[0] || "";
    const notes = [errNote, stderrOne].filter(Boolean).join(" · ");
    const notesShort =
      notes.length > 120 ? `${notes.slice(0, 120)}…` : notes || "—";
    const notesTitle = notes.length > 120 ? escapeHtml(notes) : "";
    tr.innerHTML = `<td class="cmd-log-time">${escapeHtml(ts)}</td><td class="cmd-log-cmd" title="${escapeHtml(
      fullCmd
    )}">${escapeHtml(cmdShort)}</td><td class="cmd-log-exit ${
      ok ? "cmd-log-exit--ok" : "cmd-log-exit--err"
    }">${escapeHtml(exit)}</td><td class="cmd-log-ms">${escapeHtml(
      ms
    )}</td><td class="cmd-log-notes" ${notesTitle ? `title="${notesTitle}"` : ""}>${escapeHtml(
      notesShort
    )}</td>`;
    tbodyEl.appendChild(tr);
  }
}
