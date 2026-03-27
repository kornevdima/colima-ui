import { setColimaActionsDisabled } from "./colima-view.js";
import { setSidebarRefreshBusy } from "./sidebar.js";

/**
 * @param {{
 *   colimaRoot: HTMLElement;
 *   profileSelect: HTMLSelectElement;
 *   setStatus: (msg: string, isError?: boolean) => void;
 *   refresh: () => Promise<void>;
 * }} ctx
 */
export function wireColimaActions(ctx) {
  const api = window.colimaUi;
  if (!api) return;

  function setGlobalBusy(busy) {
    setSidebarRefreshBusy(busy);
    setColimaActionsDisabled(ctx.colimaRoot, busy);
  }

  async function runAction(label, fn) {
    setGlobalBusy(true);
    ctx.setStatus(`${label}…`);
    try {
      const res = await fn();
      const tail = [res.stdout, res.stderr].filter(Boolean).join("\n").trim();
      if (res.ok) {
        ctx.setStatus(`${label} finished.`);
      } else {
        ctx.setStatus(`${label} failed (exit ${res.code ?? "?"}). ${tail}`, true);
      }
    } catch (e) {
      ctx.setStatus(`${label} error: ${e}`, true);
    } finally {
      setGlobalBusy(false);
      await ctx.refresh();
    }
  }

  ctx.colimaRoot.querySelector('[data-colima-action="start"]')?.addEventListener("click", () => {
    const profile = ctx.profileSelect.value || undefined;
    runAction("Start Colima", () => api.colimaStart({ profile, preset: null }));
  });

  ctx.colimaRoot.querySelector('[data-colima-action="start-k8s"]')?.addEventListener("click", () => {
    const profile = ctx.profileSelect.value || undefined;
    runAction("Start Colima with Kubernetes", () =>
      api.colimaStart({ profile, preset: "kubernetes" })
    );
  });

  ctx.colimaRoot.querySelector('[data-colima-action="stop"]')?.addEventListener("click", () => {
    const profile = ctx.profileSelect.value || undefined;
    runAction("Stop Colima", () => api.colimaStop({ profile }));
  });
}
