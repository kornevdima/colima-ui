const VIEWS = ["colima", "docker-containers", "docker-images"];

/**
 * @param {{
 *   onRefresh: () => void;
 *   onNavigate: (view: string) => void;
 * }} handlers
 */
export function setupSidebar(handlers) {
  const refreshBtn = document.getElementById("sidebar-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => handlers.onRefresh());
  }

  for (const id of VIEWS) {
    const btn = document.getElementById(`nav-${id}`);
    if (!btn) continue;
    btn.addEventListener("click", () => handlers.onNavigate(id));
  }
}

export function setSidebarRefreshBusy(busy) {
  const btn = document.getElementById("sidebar-refresh");
  if (btn) btn.disabled = busy;
}

export function setActiveNav(view) {
  for (const id of VIEWS) {
    const btn = document.getElementById(`nav-${id}`);
    if (!btn) continue;
    const active = id === view;
    btn.classList.toggle("nav-item--active", active);
    if (active) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  }
}

export function showView(view) {
  for (const id of VIEWS) {
    const panel = document.getElementById(`view-${id}`);
    if (!panel) continue;
    const on = id === view;
    panel.classList.toggle("view--hidden", !on);
    panel.hidden = !on;
  }
}
