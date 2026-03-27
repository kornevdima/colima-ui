# Requirements — Colima UI (POC)

**Version:** 0.1  
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
| **FR-02** | The system shall invoke the **installed** `colima` binary only (no bundled Colima VM/runtime). | Must | Implemented | `lib/cli.js` → `execFile("colima", …)` |
| **FR-03** | The system shall invoke the **installed** `docker` binary for container visibility. | Must | Implemented | `lib/cli.js` → `execFile("docker", …)` |
| **FR-04** | The user shall **start Colima** for the selected profile via the UI (plain start: `colima start -p <profile>`). | Must | Implemented | IPC `colima:start`, `renderer.js` → **Start** |
| **FR-05** | The user shall **start Colima with Kubernetes** using the same resource preset as `workflow.md` (`--cpu 4 --memory 8 --kubernetes`) for the selected profile. | Must | Implemented | IPC `colima:start` with `preset: "kubernetes"` |
| **FR-06** | The user shall **stop Colima** for the selected profile (`colima stop -p <profile>`). | Must | Implemented | IPC `colima:stop` |
| **FR-07** | The user shall **refresh** Colima and Docker views on demand (no continuous polling required for POC). | Must | Implemented | **Refresh** → `colima:list`, `colima:status`, `docker:info`, `docker:ps`, versions |
| **FR-08** | The system shall show **Colima instance list** and structured **status** where the CLI provides JSON (`colima list -j`, `colima status -j`). | Must | Partial | When Colima is **not running**, `colima status -j` may fail without JSON; UI still shows **list** + stderr in combined panel (`renderer.js`, `main.js`) |
| **FR-09** | The system shall show a **Docker summary** (from `docker info`) and a **container list** (from `docker ps -a`). | Must | Implemented | IPC `docker:info`, `docker:ps` |
| **FR-10** | The user shall **select a Colima profile** before start/stop/status where applicable. | Must | Implemented | `#profile` populated from `colima list -j` |
| **FR-11** | The application shall be launchable via **`npm start`** from the project root. | Must | Implemented | `package.json` scripts |
| **FR-12** | The system shall display **Colima** and **Docker** CLI version information (best-effort). | Should | Implemented | `colima:version`, `docker:version` |

### 3.1 Explicitly out of scope (POC)

| ID | Requirement | Rationale |
|----|-------------|-----------|
| **FR-X-01** | Drive **kubectl**, **Helm**, **istioctl**, or Istio addons from the UI | Covered by **`workflow.md`**; separate product surface |
| **FR-X-02** | **Realtime** auto-refresh or file/socket watchers | User NFR: refresh-only POC |
| **FR-X-03** | **Packaged** installers (DMG, MSI, auto-update) | Not requested for POC |
| **FR-X-04** | Editable **CPU/memory** or arbitrary **CLI argument** builder | Preset fixed to workflow; **[TBD]** for future FR |

---

## 4. Non-functional requirements

| ID | Requirement | Priority | Status | Notes |
|----|-------------|----------|--------|-------|
| **NFR-01** | **Security:** subprocess invocation shall use **argument arrays** (e.g. `execFile`), not shell string concatenation, for `colima` / `docker`. | Must | Implemented | `lib/cli.js` |
| **NFR-02** | **Security:** renderer shall **not** enable Node integration; use **context isolation** and a narrow **preload** bridge. | Must | Implemented | `main.js` `webPreferences`, `preload.js` |
| **NFR-03** | **Reliability:** long-running `colima start` / `colima stop` shall not use the same short timeout as read-only commands. | Must | Implemented | 15 min vs 60 s in `main.js` |
| **NFR-04** | **Usability:** failed CLI runs shall surface **exit context** (stderr / code) in the UI status line where practical. | Should | Implemented | `renderer.js` `runAction` / `refresh` warnings |
| **NFR-05** | **Operability:** documentation shall map UI actions to **CLI equivalents** and to **`workflow.md`**. | Should | Implemented | `README.md`, this doc |

---

## 5. Traceability (FR → code)

| FR | Primary artifacts |
|----|-------------------|
| FR-01, FR-11 | `package.json`, `main.js`, `index.html` |
| FR-02, FR-03, NFR-01, NFR-03 | `lib/cli.js`, `lib/config.js`, `domain/colima/colima-operations.js`, `domain/docker/docker-operations.js` |
| FR-04–FR-07, FR-10 | `main.js` (`colima:*` IPC), `domain/colima/colima-operations.js`, `renderer/app.js`, `renderer/colima-actions.js`, `renderer/sidebar.js`, `index.html` |
| FR-08 | `domain/colima/colima-operations.js` (list/status parsing), `renderer/colima-view.js`, `renderer/refresh.js` |
| FR-09 | `domain/docker/docker-operations.js`, `renderer/docker-view.js`, `renderer/refresh.js` |
| FR-12 | `domain/colima/colima-operations.js`, `domain/docker/docker-operations.js`, `renderer/refresh.js` |
| NFR-02 | `main.js`, `preload.js` |
| NFR-05 | `README.md`, `docs/*`, `lib/config.js` |

**NFR (twelve-factor config / logs):** `lib/config.js`, `lib/logger.js`; **future K8s:** `domain/kubernetes/kubernetes-operations.js`, IPC `kubernetes:getNodes`.

---

## 6. Change control

When adding features, append new rows with new IDs; mark superseded requirements **Deprecated** with a pointer to the replacement. Keep **`docs/ARCHITECTURE.md`** in sync for structural or trust-boundary changes.

Does this look right?
