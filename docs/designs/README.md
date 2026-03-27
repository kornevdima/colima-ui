# Design documentation

This folder records **product and UX decisions** that are **not** spelled out as functional requirements in [REQUIREMENTS.md](../REQUIREMENTS.md). It complements [ARCHITECTURE.md](../ARCHITECTURE.md), which covers runtime structure and IPC.

| Document | Purpose |
|----------|---------|
| [design-decisions.md](./design-decisions.md) | Short decision records (rationale, alternatives, consequences). |
| [component-library.md](./component-library.md) | Named UI building blocks, class map, states, and tokens — **aligned to the current POC**. |

**Source of truth for implementation:** `index.html` and `styles.css` at the repo root. When the UI changes, update these design docs in the same change when the decision or pattern is intentional.
