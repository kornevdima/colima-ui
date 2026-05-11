# Colima UI

Small **desktop POC** for **Colima** and **Docker** on your Mac. It uses the same CLIs already on your PATH (no bundled runtime). Updates are **manual refresh**, not live streaming—by design for this POC.

**Solutioning docs**

- **[docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md)** — functional and non-functional requirements (FR / NFR), assumptions, scope, traceability to code.
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — context and sequence views, components, IPC contract, ADRs, security boundaries.
- **[docs/designs/](./docs/designs/)** — UX/design decisions (**DD-***) and **[component library](./docs/designs/component-library.md)** (tokens, layout, patterns).

**How this fits the workflow:** `workflow.md` is the source of truth for the full **Istio / Kubernetes** lab (prereqs, Colima start flags, kubectl, Helm, cleanup). This app only automates the **Colima + Docker** slice at the bottom of that funnel. After Colima is up, you continue in `workflow.md` from Istio install onward.

---

## Why Electron (Node) here

- The **main process** runs **Node.js** and can call `colima` / `docker` via `child_process.execFile` safely (argument arrays, no shell injection).
- The **renderer** is a simple HTML UI. That split matches how most Node-based desktop tools are built (Electron/Tauri-style); Electron was chosen so the implementation stays entirely in **JavaScript** as you asked.

---

## Prerequisites

Same base tooling as `workflow.md`:

- **Colima** and **Docker** (via Colima’s Docker context when the VM is running)
- **Node.js** (LTS) and **npm** — only to install and run this dev shell

You do **not** need this app to follow `workflow.md`; it is optional convenience.

---

## Install and run

```bash
cd /path/to/colima-ui
npm install
npm start
```

First launch may download the **Electron** binary (npm postinstall). Requires network once.

---

## Configuration (twelve-factor)

Runtime behaviour is driven by **environment variables** (no config file in the repo). Main process logs are **JSON lines on stdout** (`COLIMA_UI_LOG_LEVEL`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `COLIMA_UI_COLIMA_BIN` | `colima` | Colima executable |
| `COLIMA_UI_DOCKER_BIN` | `docker` | Docker executable |
| `COLIMA_UI_KUBECTL_BIN` | `kubectl` | kubectl executable (Kubernetes sidebar views) |
| `COLIMA_UI_TIMEOUT_SHORT_MS` | `60000` | Read-only CLI calls |
| `COLIMA_UI_TIMEOUT_LONG_MS` | `900000` | `colima start` / `colima stop` |
| `COLIMA_UI_K8S_CPU` | `4` | CPU flag for **Start + Kubernetes** |
| `COLIMA_UI_K8S_MEMORY_GIB` | `8` | `--memory` (GiB) for that preset |
| `COLIMA_UI_K8S_ENABLED` | `1` | Set to `0` to skip all `kubectl` list calls on **Refresh** (no cluster / docker-only) |
| `COLIMA_UI_K8S_SERVICES_NAMESPACE` | `istio-system` | `kubectl get svc -n <value>`; set to **empty** (`COLIMA_UI_K8S_SERVICES_NAMESPACE=`) for `kubectl get svc -A` |
| `COLIMA_UI_LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `COLIMA_UI_TERMINAL_LINUX` | *(auto)* | Optional Linux terminal binary; if unset, tries **gnome-terminal** then **x-terminal-emulator**, else runs **bash** in background (no window). When set, invoked as `TERM -e bash -lc '<docker cmd>'`. |

Domain layout: **`domain/colima`**, **`domain/docker`**, **`domain/kubernetes`** — see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Mapping: UI ↔ `workflow.md` commands

| UI control | Equivalent CLI (see `workflow.md`) |
|------------|--------------------------------------|
| **Refresh** | `colima list -j`, `colima status -j`, `colima template --print` (+ file read), `docker info` / `ps` / `image ls` / `volume ls` / `network ls` (with per-tab filters where set), versions; unless `COLIMA_UI_K8S_ENABLED=0`, also `kubectl get nodes`, `kubectl get pods -A`, `kubectl get svc -n …` (default `istio-system`, or `-A` if namespace env is empty), `kubectl get gateway.networking.istio.io -A`, `kubectl get virtualservice.networking.istio.io -A` |
| **Start** | `colima start -p <profile>` |
| **Start + Kubernetes** | `colima start --cpu 4 --memory 8 --kubernetes` (+ `-p <profile>` if not default) — same idea as *§1. Start Colima with Kubernetes* |
| **Stop** | `colima stop` — same idea as *Cleanup* `colima stop` |

**Profile** maps to Colima’s `-p` / instance name from `colima list`.

**Not implemented in the POC** (still do these from the terminal per `workflow.md`): broad mutating `kubectl` (**apply**, bulk ops), **Helm** / **istioctl**, Istio addon installs, and similar. Under **Kubernetes**, the app lists resources and offers context-menu **terminal** actions (exec, logs, port-forward) plus confirmed **delete pod** / **delete service**; everything else stays in `workflow.md`.

---

## Architecture (short)

| File / folder | Purpose |
|---------------|---------|
| `main.js` | Electron main: wires config, logger, domains, IPC |
| `lib/config.js` | Env-based configuration |
| `lib/logger.js` | Structured stdout logging |
| `lib/cli.js` | `execFile` helper only |
| `lib/terminal-launch.js` | Spawn system terminal with `docker attach` / `exec` |
| `domain/colima/colima-operations.js` | Colima use-cases |
| `domain/docker/docker-operations.js` | Docker use-cases |
| `domain/kubernetes/kubernetes-operations.js` | Kubernetes stub / optional `kubectl` |
| `preload.js` | Exposes a small API to the page via `contextBridge` |
| `renderer/app.js` | UI entry (ES modules) |
| `renderer/sidebar.js`, `renderer/refresh.js`, `renderer/colima-view.js`, `renderer/docker-view.js`, `renderer/colima-actions.js`, `renderer/utils.js` | Sidebar, refresh orchestration, view renderers, Colima buttons |
| `index.html`, `styles.css` | Shell layout + styles |

Timeouts: configurable via env; default **15 minutes** for `colima start` / `colima stop`.

---

## Behaviour notes

- If Colima is **stopped**, `colima status -j` may **fail** with a fatal message and **no JSON**. The UI still relies on **`colima list -j`** for instance state and shows combined output in the Colima panel.
- **Docker** commands use your current environment (including `DOCKER_HOST` if set). When Colima provides the socket, that is what the CLI normally uses.

---

## Suggested order of work (aligned with delivery flow)

1. **Define** what “POC done” means (you already chose: refresh OK, Colima + Docker basics).
2. **Use** this app or the raw CLI to get Colima running (**Start + Kubernetes** matches step 1 in `workflow.md`).
3. **Follow** `workflow.md` from **§2. Install Istio** through verification and cleanup.

If you extend the product later, document new IPC commands and UI actions in this table the same way.
