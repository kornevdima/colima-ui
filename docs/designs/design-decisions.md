# Design decisions

Records use **DD-** ids for traceability in PRs and issues. They do not replace FRs; they explain *why* the interface looks and behaves as it does beyond “must work.”

---

### DD-001 — App shell: fixed sidebar, scrollable main

- **Context:** Long Colima JSON or Docker tables made the whole window scroll; profile and refresh moved off-screen.
- **Decision:** `body` does not scroll. **`.shell`** is viewport height; **`.sidebar`** is full height; only **`.main`** uses vertical scroll (`overflow-y: auto`).
- **Alternatives considered:** Sticky sidebar on a scrolling document (still janky with Electron chrome); floating refresh (adds noise).
- **Consequences:** `html, body { height: 100%; overflow: hidden }` on `body`; flex `min-height: 0` on scroll children. New views must live inside `.main`.

---

### DD-002 — Sidebar structure: brand → nav (flex grow) → tools → meta

- **Context:** Need persistent access to **Refresh** and **Profile** without scrolling the app.
- **Decision:** **`.sidebar-nav`** is `flex: 1` with internal scroll if many items; **`.sidebar-tools`** and **`.sidebar-foot`** are `flex-shrink: 0` below it.
- **Alternatives considered:** Refresh in the header of each view (duplicated); hamburger menu (hidden affordances for a dev tool).
- **Consequences:** Section nav items stay at the top of the flexible region; empty space grows between nav and tools when few items.

---

### DD-003 — Section navigation (Colima / Docker) as sibling views

- **Context:** Two bounded domains (aligned with backend); more sections (e.g. Kubernetes) expected later.
- **Decision:** One **view** visible at a time (`#view-colima`, `#view-docker-containers`, `#view-docker-images`); sidebar **`.nav-item`** switches visibility; **Docker** uses a **`.nav-group`** with sub-items; `aria-current` on the active item.
- **Alternatives considered:** Single long page with anchors (harder to focus); tabs only in main (sidebar redundancy).
- **Consequences:** `renderer/sidebar.js` owns a small list of view ids; adding a section requires HTML + CSS + sidebar list.

---

### DD-004 — Dark theme with CSS variables (design tokens)

- **Context:** Dev-tool aesthetic; reduce glare; match common CLI/IDE dark UIs.
- **Decision:** Single theme; semantic tokens in **`:root`** (`--bg`, `--accent`, `--danger`, etc.). No runtime theme switch in the POC.
- **Alternatives considered:** System `prefers-color-scheme` (deferred); light theme (not requested).
- **Consequences:** All new components should use tokens, not raw hex, unless documenting an exception.

---

### DD-005 — Typography: DM Sans + JetBrains Mono

- **Context:** Distinct from system-default stacks; clear separation between UI copy and data.
- **Decision:** **DM Sans** for UI; **JetBrains Mono** for JSON, table cells, version footnote — loaded from Google Fonts with CSP allowances.
- **Alternatives considered:** System fonts only (faster, less character); a single font (worse scanability for logs/JSON).
- **Consequences:** Offline / air-gapped use may fall back after failed font load; acceptable for POC.

---

### DD-006 — Colima state as JSON in a `pre.mono-block`

- **Context:** FRs require showing Colima data; rich cards would be more work and might lie about fields.
- **Decision:** Raw structured dump (list + status) for transparency and fast iteration; refresh-driven.
- **Alternatives considered:** Parsed cards per field (heavier maintenance); terminal emulator (overkill).
- **Consequences:** Users read JSON; future work can add a “summary row” without removing the block.

---

### DD-007 — Docker summary as metric tiles + data table

- **Context:** `docker info` and `docker ps` serve different mental models (engine vs workload).
- **Decision:** **`.docker-summary`** grid of **`.kv`** tiles for scalars; **`.data-table`** for containers.
- **Alternatives considered:** JSON only (consistent with Colima but worse for scanning containers); split tabs inside Docker (extra navigation).
- **Consequences:** Renderer builds DOM strings with `escapeHtml` for safety.

---

### DD-008 — Button semantics: default, primary, danger

- **Context:** Multiple actions with different risk (stop vs refresh).
- **Decision:** **`.btn`** default (neutral); **`.btn.primary`** for main positive path (Refresh); **`.btn.danger`** for destructive (Stop). Start actions stay default to avoid gradient clutter.
- **Alternatives considered:** All primary (no hierarchy); icon-only toolbar (accessibility + learning cost).
- **Consequences:** Disabled state is global opacity; long operations disable refresh + Colima actions together.

---

### DD-009 — Status line for operational feedback

- **Context:** CLI errors and refresh timing need a non-blocking channel.
- **Decision:** **`.status-line`** under main header, `role="status"`; **`.error`** modifier for warnings/failures.
- **Alternatives considered:** Toasts (no toast stack in POC); inline only in JSON (easy to miss).
- **Consequences:** One line; first warning wins on refresh when multiple issues exist.

---

### DD-010 — CSP and ES modules in the renderer

- **Context:** Electron renderer security baseline.
- **Decision:** Strict **`script-src 'self'`**; no inline scripts; **`type="module"`** entry at `renderer/app.js`.
- **Alternatives considered:** Bundler (Vite) — deferred for POC simplicity.
- **Consequences:** New scripts must be same-origin files; inline event handlers forbidden.

---

### DD-011 — Accessibility baseline for shell and views

- **Context:** Nav is custom buttons, not `<a href>`.
- **Decision:** `aria-label` on sidebar and section nav; **`aria-labelledby`** on views; **`aria-current="page"`** on active nav; **`aria-live="polite"`** on Colima JSON block.
- **Alternatives considered:** Full WCAG audit — out of scope for POC; minimum viable semantics first.
- **Consequences:** Keyboard focus order follows DOM order; future keyboard shortcuts should be documented here.

---

### DD-012 — Fluid content panel width

- **Context:** `.view .panel` used a **1000px** max-width, so the Docker table stayed narrow on large displays and often needed horizontal scroll despite available space.
- **Decision:** Panels are **100% of `.main`** (`width` / `max-width: 100%`, `min-width: 0` for flex overflow). **`.table-wrap`** keeps `overflow-x: auto` for narrow windows or very wide rows. Table cells use **`overflow-wrap: anywhere`** / **`word-break: break-word`** so long image names use width when possible.
- **Alternatives considered:** Very large pixel cap (e.g. 1600px) — still arbitrary; **`min()` with viewport** — unnecessary while `.main` already tracks the window minus the sidebar.
- **Consequences:** On ultra-wide monitors lines can get very long in the Colima JSON block; acceptable for a dev POC.

---

### DD-013 — Container row context menu → system terminal

- **Context:** Users need **attach** / interactive **exec** without an in-app PTY or log viewer.
- **Decision:** **Right-click** a container row (with `data-container-id`) → **Electron `Menu`**. Actions spawn the **OS default terminal** with `docker attach` or `docker exec -it … /bin/sh` (`lib/terminal-launch.js`). **macOS:** AppleScript **Terminal**; **Windows:** `start cmd /k`; **Linux:** `gnome-terminal` / `x-terminal-emulator` / `bash` fallback or **`COLIMA_UI_TERMINAL_LINUX`**.
- **Alternatives considered:** node-pty in renderer (heavy, security); **iTerm** by default on Mac (defer to env / future).
- **Consequences:** Container ID validated as hex (12–128 chars) before menu; stopped containers still offer menu — **attach** may fail in the external terminal.

---

### DD-014 — Remove container / image from context menu

- **Context:** Users need to drop resources without leaving the app for a raw terminal.
- **Decision:** After confirmation (**Electron `dialog`**), main runs **`docker rm -f`** / **`docker rmi -f`** via **`domain/docker`**; on success emits **`docker:mutation`** so the renderer **refreshes**. Attach/exec stay external-terminal only.
- **Consequences:** **`-f`** can stop running containers / untag images in use; errors show a second dialog with stderr.

### DD-015 — Open published ports in browser

- **Context:** Containers expose HTTP on `0.0.0.0:port` / `[::]:port` etc.; users want one click from the row.
- **Decision:** Store raw **`Ports`** on **`data-container-ports`**; **`renderer/docker-ports.js`** parses host-side bindings (`…->…/tcp`), builds **`http://`** URLs (literal **`0.0.0.0`** when Docker reports it; **`::`** → **`localhost`**); **dedupe by numeric port** so IPv4+IPv6 duplicates share one menu item; main validates with **`URL`** and **`shell.openExternal`**.
- **Consequences:** Only **http** (not https) unless we extend later; internal-only hosts may not resolve in the browser.

---

When you add a meaningful UX or visual choice, append a new **DD-** row (or short subsection) here and, if needed, a row in [component-library.md](./component-library.md).
