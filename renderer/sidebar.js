const VIEWS = [
  "colima-runtime",
  "colima-profiles",
  "colima-template",
  "docker-containers",
  "docker-images",
  "docker-volumes",
  "docker-networks",
  "kubernetes-nodes",
  "kubernetes-pods",
  "kubernetes-gateways",
  "kubernetes-virtualservices",
  "app-logs",
];

const VIEW_TO_GROUP = {
  "colima-runtime": "colima",
  "colima-profiles": "colima",
  "colima-template": "colima",
  "docker-containers": "docker",
  "docker-images": "docker",
  "docker-volumes": "docker",
  "docker-networks": "docker",
  "kubernetes-nodes": "kubernetes",
  "kubernetes-pods": "kubernetes",
  "kubernetes-gateways": "kubernetes",
  "kubernetes-virtualservices": "kubernetes",
};

const GROUPS = ["colima", "docker", "kubernetes"];

/**
 * @param {string} group
 * @param {boolean} open
 */
function setGroupExpanded(group, open) {
  const root = document.querySelector(`.nav-accordion[data-accordion="${group}"]`);
  if (!root) return;
  const btn = root.querySelector(".nav-group-toggle");
  const items = root.querySelector(".nav-group-items");
  root.classList.toggle("nav-accordion--expanded", open);
  if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  if (items) {
    items.hidden = !open;
  }
}

/**
 * @param {string | undefined} group
 */
function expandOnlyGroup(group) {
  for (const g of GROUPS) {
    setGroupExpanded(g, g === group);
  }
}

/**
 * @param {string} view
 */
export function syncAccordionForView(view) {
  const g = VIEW_TO_GROUP[view];
  if (g) expandOnlyGroup(g);
}

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

  document.querySelectorAll(".nav-group-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const group = btn.getAttribute("data-accordion");
      if (!group) return;
      const root = btn.closest(".nav-accordion");
      const expanded = root?.classList.contains("nav-accordion--expanded");
      if (expanded) {
        setGroupExpanded(group, false);
      } else {
        expandOnlyGroup(group);
      }
    });
  });

  for (const id of VIEWS) {
    const navBtn = document.getElementById(`nav-${id}`);
    if (!navBtn) continue;
    navBtn.addEventListener("click", () => {
      const g = VIEW_TO_GROUP[id];
      if (g) expandOnlyGroup(g);
      handlers.onNavigate(id);
    });
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
