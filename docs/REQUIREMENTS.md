# Requirements — Colima UI (POC)

**Version:** 0.2  
**Scope:** Proof-of-concept desktop helper for Colima and Docker, aligned with stated product intent and `workflow.md` for the wider Istio lab.

This document captures **functional requirements (FRs)** and **non-functional requirements (NFRs)**. Implementation status reflects the codebase as of this revision.

**UX, visual, and layout choices** that are not FRs are recorded under **[docs/designs/](designs/README.md)** (design decisions **DD-***, component library).

---

## 1. Problem statement

Developers running **Colima** and **Docker** locally want a **small desktop utility** (Node.js ecosystem) that mirrors part of the “Docker Desktop–style” experience: see runtime state and run common lifecycle actions, **without** embedding Colima or Docker inside the app. The full **Kubernetes / Istio** lab remains documented in **`workflow.md`** and is **out of scope** for this POC.

---

## 2. Assumptions

| ID | Assumption |
|----|------------|
| A-1 | **Colima** and **Docker** CLIs are installed and on the user’s `PATH` when the app runs. |
| A-2 | The user may run **multiple Colima profiles**; the UI exposes a profile selector derived from `colima list`. |
| A-3 | **Realtime** updates (watchers, streaming) are **not** required for the POC; explicit refresh is acceptable. |

---

## 3. Functional requirements

| ID | Requirement | Priority | Status | Implementation notes |
|----|-------------|----------|--------|----------------------|
| **FR-01** | The system shall provide a **desktop application** whose backend logic runs in a **Node.js** runtime (Electron main process). | Must | Implemented | `main.js`, `package.json` (`electron`) |
| **FR-02** | The system shall invoke the **installed** `colima` binary only (no bundled Colima VM/runtime). | Must | Implemented | `lib/cli.js` → `execFile` with argv arrays |
| **FR-03** | The system shall invoke the **installed** `docker` binary for engine visibility and resource lists. | Must | Implemented | `lib/cli.js` → `domain/docker/docker-operations.js` |
| **FR-04** | The user shall **start Colima** for the selected profile (`-p`), passing **plain start** flags from the Runtime form: CPU, memory (GiB), disk (GiB), container **runtime**, and **VM type**, merged with env defaults (`COLIMA_UI_START_*` in `lib/config.js`). | Must | Implemented | IPC `colima:start`, `colima:uiDefaults`, `renderer/colima-actions.js`, `renderer/colima-view.js` |
| **FR-05** | The user shall **start Colima with Kubernetes** for the selected profile using **CPU, memory, disk** from the same form (defaults `COLIMA_UI_K8S_*`) plus `--kubernetes`, and optional **`--kubernetes-version`** when the field is set (sanitized in domain). | Must | Implemented | IPC `colima:start` with `preset: "kubernetes"` |
| **FR-06** | The user shall **stop Colima** for the selected profile (`colima stop -p <profile>`). | Must | Implemented | IPC `colima:stop` |
| **FR-07** | The user shall **refresh** on demand: reload Colima list/status, Colima template file, Docker **info**, **containers**, **images**, **volumes**, **networks**, and CLI versions (no continuous polling required for POC). | Must | Implemented | **Refresh** → `renderer/refresh.js`, parallel IPC calls |
| **FR-08** | The system shall show **Colima list** and **status** JSON from `colima list -j` and `colima status -j` (for the sidebar profile) on **Runtime · Telemetry**. When the daemon is stopped, status may lack JSON; list + stderr still surface. | Must | Implemented | `renderer/colima-view.js` `renderColimaTelemetry` |
| **FR-09** | The system shall show **Docker summary** (`docker info`) and **container list** (`docker ps -a`) with optional **per-line filters** (`docker ps -f`). | Must | Implemented | **Docker · Containers**; IPC `docker:info`, `docker:ps` |
| **FR-10** | The user shall **select a Colima profile** in the sidebar for start/stop/status and Runtime telemetry. | Must | Implemented | `#sidebar-profile` from `colima list -j` |
| **FR-11** | The application shall be launchable via **`npm start`** from the project root. | Must | Implemented | `package.json` scripts |
| **FR-12** | The system shall display **Colima** and **Docker** CLI version information (best-effort) in the sidebar. | Should | Implemented | `colima:version`, `docker:version` |
| **FR-13** | The system shall list **Docker images** (`docker image ls`) with optional **filters** and a **native context menu** to **remove** an image (`docker rmi -f`) with confirmation; successful removal shall refresh lists. | Should | Implemented | **Docker · Images**; IPC `docker:images`, `images:contextMenu`; `docker:mutation` |
| **FR-14** | The system shall list **Docker volumes** (`docker volume ls`) with optional **filters** and a **native context menu** to **remove** a volume (`docker volume rm -f`) with confirmation; successful removal shall refresh lists. | Should | Implemented | **Docker · Volumes**; IPC `docker:volumes`, `volumes:contextMenu` |
| **FR-15** | The system shall list **Docker networks** (`docker network ls --no-trunc`) with optional **filters** (`docker network ls -f`). | Should | Implemented | **Docker · Networks**; IPC `docker:networks` |
| **FR-16** | For **container** rows, the system shall offer a **native context menu**: **Attach** and **interactive shell** (`exec -it /bin/sh`) in the **system terminal**, **tail logs** (`docker logs -f --tail 200`) in the terminal, **open published HTTP(S) URLs** in the default browser where parsed from port bindings, and **remove** the container (`docker rm -f`) with confirmation. | Should | Implemented | `main.js` `containers:contextMenu`, `lib/terminal-launch.js`, `renderer/docker-ports.js` |
| **FR-17** | The UI shall provide **section navigation**: collapsible **Colima**, **Docker**, and **Kubernetes** groups; **Colima** — **Runtime**, **Profiles**, **Template**; **Docker** — **Containers**, **Images**, **Volumes**, **Networks**; **Kubernetes** — **Nodes**, **Pods**, **Services**, **Gateways** (Istio), **VirtualServices** (Istio); sidebar **Settings** opens the **Settings** view; **Logs** opens the **command log** view. | Should | Implemented | `renderer/sidebar.js`, `index.html`, `styles.css` |
| **FR-18** | The system shall expose **Colima default instance template**: resolve path via `colima template --print`, show file contents on **Template**, and open **`COLIMA_UI_TEMPLATE_EDITOR`** (default `vim`) on that path in the **system terminal**. | Should | Implemented | IPC `colima:template`, `colima:templateEditInTerminal`; `domain/colima/colima-operations.js` |
| **FR-19** | The system shall record each **`lib/cli.js`** subprocess completion in an **in-memory ring buffer** and let the user **view** and **clear** the log from the **Logs** view; new entries may be **pushed** to the renderer when the log view is relevant. | Should | Implemented | `lib/command-log.js`, `lib/cli.js` `setAfterRunHook`, IPC `command-log:*`, `renderer/command-log-view.js` |
| **FR-20** | **Kubernetes:** On refresh, the app shall run **`kubectl`** to list **nodes**, **pods** (`-A`), **services** (`get svc` with list scope: **From Settings** / effective `COLIMA_UI_K8S_SERVICES_NAMESPACE`, **All namespaces**, or **Specify…**), **Istio Gateways**, and **Istio VirtualServices** (`-o json`), and render tables. Disable **lists** via **`COLIMA_UI_K8S_ENABLED=0`** or Settings. **Pods:** context menu → **Shell** / **Tail logs** / **Stop pod** (`kubectl delete pod`, confirm) → refresh. **Services:** context menu → **Port-forward**, **Tail logs** (selector-based), **Stop service** (`kubectl delete service`, confirm) → refresh. | Should | Implemented | IPC `kubernetes:get*`, `pods:contextMenu`, `services:contextMenu`, `kubernetes:mutation`, `domain/kubernetes/kubernetes-operations.js`, `lib/k8s-identifiers.js`, `renderer/pods-context.js`, `renderer/services-context.js`, `renderer/k8s-view.js`, `renderer/refresh.js`, `index.html` |
| **FR-21** | The user shall **view and edit** all supported **`COLIMA_UI_*`** tunables from a **Settings** view in the main area: values reflect **effective** config (env at launch plus saved overrides), with **Save** (persist to `user-settings.json`), **Reset to environment defaults**, and post-save **Refresh** + Colima Runtime form reload. | Should | Implemented | `lib/config-fields.js`, `lib/user-settings.js`, `lib/runtime-config.js`, `lib/settings-presenter.js`, IPC `settings:*`, `renderer/settings-view.js` |

### 3.1 Explicitly out of scope (POC)

| ID | Requirement | Rationale |
|----|-------------|-----------|
| **FR-X-01** | **Broad** mutating **kubectl** (apply, bulk delete), **Helm**, **istioctl**, or Istio addon installs from the UI | Scoped exceptions: context-menu **delete pod** / **delete service** with confirmation; other lab steps stay in **`workflow.md`** |
| **FR-X-02** | **Realtime** auto-refresh or file/socket watchers | User NFR: refresh-only POC |
| **FR-X-03** | **Packaged** installers (DMG, MSI, auto-update) | Not requested for POC |
| **FR-X-04** | ~~Fixed CPU/memory only; no UI for start resources~~ | **Deprecated** — superseded by **FR-04**, **FR-05**, and Runtime form + `lib/config.js` |
| **FR-X-05** | **Remove Docker networks** from the UI | Not implemented; `docker network rm` deferred |
| **FR-X-06** | **Persistent** command log across app restarts | In-memory / session-only by design (`lib/command-log.js`) |

---

## 4. Non-functional requirements

| ID | Requirement | Priority | Status | Notes |
|----|-------------|----------|--------|-------|
| **NFR-01** | **Security:** subprocess invocation shall use **argument arrays** (e.g. `execFile`), not shell string concatenation, for `colima` / `docker` / `kubectl`. | Must | Implemented | `lib/cli.js` |
| **NFR-02** | **Security:** renderer shall **not** enable Node integration; use **context isolation** and a narrow **preload** bridge. | Must | Implemented | `main.js` `webPreferences`, `preload.js` |
| **NFR-03** | **Reliability:** long-running `colima start` / `colima stop` shall not use the same short timeout as read-only commands. | Must | Implemented | `lib/config.js` `timeouts` (long vs short) |
| **NFR-04** | **Usability:** failed CLI runs shall surface **exit context** (stderr / code) in the UI status line or dialogs where practical. | Should | Implemented | `renderer/colima-actions.js`, `renderer/refresh.js`, `main.js` `dialog` on template edit failure |
| **NFR-05** | **Operability:** documentation shall map UI actions to **CLI equivalents** and to **`workflow.md`**. | Should | Implemented | `README.md`, `docs/ARCHITECTURE.md`, this doc |

---

## 5. Traceability (FR → code)

| FR | Primary artifacts |
|----|-------------------|
| FR-01, FR-11 | `package.json`, `main.js`, `index.html` |
| FR-02, FR-03, NFR-01, NFR-03 | `lib/cli.js`, `lib/config.js`, `lib/runtime-config.js`, `domain/colima/colima-operations.js`, `domain/docker/docker-operations.js` |
| FR-04–FR-06, FR-10 | `main.js` (`colima:*` IPC), `domain/colima/colima-operations.js`, `renderer/colima-actions.js`, `renderer/colima-view.js`, `index.html` |
| FR-07, FR-08 | `renderer/refresh.js`, `renderer/colima-view.js`, `preload.js` |
| FR-09, FR-13–FR-15 | `domain/docker/docker-operations.js`, `renderer/docker-view.js`, `renderer/refresh.js`, `index.html` |
| FR-12 | `domain/colima/colima-operations.js`, `domain/docker/docker-operations.js`, `renderer/refresh.js` |
| FR-16 | `main.js` (`containers:contextMenu`), `lib/terminal-launch.js`, `lib/docker-identifiers.js`, `renderer/containers-context.js`, `renderer/docker-ports.js` |
| FR-13 (images menu) | `main.js` `images:contextMenu`, `renderer/images-context.js` |
| FR-14 (volumes menu) | `main.js` `volumes:contextMenu`, `renderer/volumes-context.js` |
| FR-17 | `renderer/sidebar.js`, `renderer/app.js`, `index.html`, `styles.css` |
| FR-21 | `lib/config-fields.js`, `lib/user-settings.js`, `lib/runtime-config.js`, `lib/settings-presenter.js`, `main.js`, `preload.js`, `renderer/settings-view.js`, `renderer/app.js` |
| FR-18 | `domain/colima/colima-operations.js` `getTemplate`, `main.js`, `preload.js`, `renderer/colima-actions.js`, `lib/terminal-launch.js` |
| FR-19 | `lib/command-log.js`, `lib/cli.js`, `main.js`, `preload.js`, `renderer/command-log-view.js`, `renderer/app.js` |
| FR-20 | `domain/kubernetes/kubernetes-operations.js`, `lib/runtime-config.js`, `lib/k8s-identifiers.js`, `main.js`, `preload.js`, `renderer/k8s-view.js`, `renderer/pods-context.js`, `renderer/services-context.js`, `renderer/refresh.js`, `renderer/app.js`, `index.html` |
| NFR-02 | `main.js`, `preload.js` |
| NFR-05 | `README.md`, `docs/*`, `lib/config.js` |

**Cross-cutting:** `docker:mutation` (main → renderer) after successful container/image/volume removal — `preload.js` `onDockerMutation`, `renderer/app.js`. **`kubernetes:mutation`** after successful **`kubectl delete pod`** / **`kubectl delete service`** — `preload.js` `onKubernetesMutation`, `renderer/app.js`.

---

## 6. Change control

When adding features, append new rows with new IDs; mark superseded requirements **Deprecated** with a pointer to the replacement. Keep **`docs/ARCHITECTURE.md`** in sync for structural or trust-boundary changes.

Does this look right?
