# Component library (POC)

This is a **reference catalog** of UI pieces that exist today. It is not a separate design system package — classes live in `**styles.css`**; structure in `**index.html**`.

## Design tokens (`:root`)


| Token           | Role                                             |
| --------------- | ------------------------------------------------ |
| `--bg`          | Page / deep background                           |
| `--bg-elevated` | Panels, inputs, elevated surfaces                |
| `--border`      | Borders, dividers                                |
| `--text`        | Primary text                                     |
| `--muted`       | Secondary labels, nav idle                       |
| `--accent`      | Brand / success accent                           |
| `--accent-dim`  | Gradient end, pressed tones                      |
| `--danger`      | Destructive emphasis (paired with `.btn.danger`) |
| `--radius`      | Default panel radius (10px)                      |
| `--font`        | UI font stack (DM Sans)                          |
| `--mono`        | Data font stack (JetBrains Mono)                 |


---

## Layout

### Shell (`.shell`)

Top-level flex row: sidebar + main. Viewport height, `overflow: hidden`.

### Sidebar (`.sidebar`)

Fixed width **260px**, full height, column flex. Background with blur; right border.

**Children (order matters):**


| Block       | Class            | Notes                                 |
| ----------- | ---------------- | ------------------------------------- |
| Brand       | `.sidebar-brand` | Logo mark + title + tagline           |
| Section nav | `.sidebar-nav`   | Flex-grow region; scrolls if overflow |
| Tools       | `.sidebar-tools` | Profile + primary refresh             |
| Meta        | `.sidebar-foot`  | CLI version string                    |


### Main (`.main`)

Scrollable content column; padding **24px 28px 36px**.

### View (`.view` / `.view--hidden`)

Each major section is a `<section class="view">`. Hidden views use `**.view--hidden`** and `**hidden**` attribute (see `renderer/sidebar.js`).

---

## Brand


| Element   | Class              | Usage                                |
| --------- | ------------------ | ------------------------------------ |
| Logo      | `.brand-logo`      | `logo-colima.png`; rounded, `object-fit: contain` |
| Title     | `.sidebar-title`   | App name                             |
| Subtitle  | `.sidebar-tagline` | e.g. “POC”; uppercase small caps     |


---

## Navigation


| Element         | Class                   | States                                       |
| --------------- | ----------------------- | -------------------------------------------- |
| Section control | `.nav-item`             | `<button type="button">`; not a link         |
| Group label     | `.nav-group-label`      | Non-interactive; scopes **Docker** children  |
| Group container | `.nav-group`            | Divider + stacked sub-nav                    |
| Nested item     | `.nav-item--sub`        | Indented Docker sub-routes                   |
| Active section  | `.nav-item--active`     | Filled background, border, subtle green ring |
| Hover           | `:hover` on `.nav-item` | Light surface tint                           |


**Convention:** `id="nav-{section}"` matches `id="view-{section}"` (e.g. `nav-docker-images` → `view-docker-images`).

---

## Buttons


| Variant    | Classes           | Use                                    |
| ---------- | ----------------- | -------------------------------------- |
| Default    | `.btn`            | Secondary actions (Start, Start + K8s) |
| Primary    | `.btn` `.primary` | Main sidebar action (Refresh)          |
| Danger     | `.btn` `.danger`  | Stop Colima                            |
| Full width | `.btn-block`      | Sidebar refresh                        |


**States:** `:disabled` → reduced opacity; long operations disable refresh + `[data-colima-action]` buttons together (`renderer/colima-actions.js`).

---

## Forms


| Pattern                 | Classes                  | Notes                                         |
| ----------------------- | ------------------------ | --------------------------------------------- |
| Stacked label + control | `.field-stacked`         | Label uses `.label` (uppercase microcopy)     |
| Extra bottom margin     | `.field-stacked--spaced` | e.g. filter field above **Images** summary   |
| Filter textarea         | `.input-textarea`        | Monospace; `docker image ls -f` one per line  |
| Native select           | `select` (global)        | Inherits elevated background; min-width 160px |


---

## Feedback


| Component   | Class                | Notes                           |
| ----------- | -------------------- | ------------------------------- |
| Status text | `.status-line`       | `role="status"`; below main top |
| Error tone  | `.status-line.error` | Softer red for warnings/errors  |


---

## Panel (content card)


| Part          | Class            | Notes                                |
| ------------- | ---------------- | ------------------------------------ |
| Card          | `.panel`         | Elevated surface, border, `--radius` |
| Width         | `.view .panel`   | Fluid: fills `.main` (`width` / `max-width: 100%`) |
| Header row    | `.panel-head`    | Title + optional `.actions`          |
| Section title | `.panel-head h2` | Uppercase, muted color               |
| Action group  | `.actions`       | Flex wrap, gap for toolbar buttons   |


---

## Data display

### JSON / log block


| Class         | Element | Notes                                |
| ------------- | ------- | ------------------------------------ |
| `.mono-block` | `<pre>` | Scroll-x; `pre-wrap`; JSON telemetry |


### Docker summary grid


| Class                 | Role                              |
| --------------------- | --------------------------------- |
| `.docker-summary`     | CSS grid, auto-fill minmax(200px) |
| `.docker-summary .kv` | One tile                          |
| `.docker-summary .k`  | Metric label                      |
| `.docker-summary .v`  | Metric value (mono)               |


### Table


| Class                | Role                          |
| -------------------- | ----------------------------- |
| `.table-wrap`        | Horizontal scroll + border    |
| `.data-table`           | Full width table                                      |
| `.data-table th`        | Uppercase header row                                  |
| `.data-table td`        | Mono body (except **Status** column)                  |
| `.data-table .td-status` | Status column `<td>` (normal table-cell)                    |
| `.status-cell`           | Inner flex wrapper for chip + detail (avoids flex on `td`) |
| `.status-chip`          | Pill; **`.status-chip--running`** is green accent     |
| `.status-detail`        | Full `docker ps` status line (muted mono)            |
| `.data-table .empty`   | Single placeholder row (sans)                         |


---

## Renderer hooks (not visual, but coupling)


| Attribute            | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `data-colima-action` | `start` | `start-k8s` | `stop` — wired in `colima-actions.js`       |
| `data-nav`           | Present on nav buttons for clarity; routing uses `id` prefix `nav-` |
| `data-container-id`  | Full container ID → context menu (terminal attach/exec/**tail logs**, **remove**)              |
| `data-container-ports` | Raw **Ports** cell for parsing **http://** URLs (published bindings)         |
| `data-image-id`      | Image ID / digest → context menu (**remove** → `docker rmi -f`)                     |
| `onDockerMutation`   | Preload subscription: main sends **`docker:mutation`** after rm/rmi → refresh UI    |


---

## Adding a component

1. Prefer **existing tokens** and patterns (panel, `.btn`, `.nav-item`).
2. Document new classes here and add a **DD-** note in [design-decisions.md](./design-decisions.md) if the choice is non-obvious.
3. Keep **one** place for global element rules (e.g. raw `select`) unless scoped under a parent class.

