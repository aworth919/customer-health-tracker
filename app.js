/* ============================================================
   Pulse — app logic (JavaScript)
   This file:
   1. Holds mock customer data
   2. Figures out health status from a score
   3. Draws the summary + table
   4. Listens for search / filter clicks
   ============================================================ */

/** @typedef {"healthy" | "at-risk" | "critical"} HealthStatus */

/**
 * Mock customers — pretend this came from an API or spreadsheet.
 * score: 0 (worst) to 100 (best)
 */
const customers = [
  {
    id: 1,
    name: "Acme Robotics",
    plan: "Enterprise",
    owner: "Maya Chen",
    score: 92,
    lastTouch: "2026-07-14",
  },
  {
    id: 2,
    name: "Nova Health",
    plan: "Growth",
    owner: "Jordan Lee",
    score: 61,
    lastTouch: "2026-07-02",
  },
  {
    id: 3,
    name: "Brightline Logistics",
    plan: "Enterprise",
    owner: "Sam Ortiz",
    score: 38,
    lastTouch: "2026-06-18",
  },
  {
    id: 4,
    name: "Cedar & Co",
    plan: "Starter",
    owner: "Priya Shah",
    score: 78,
    lastTouch: "2026-07-12",
  },
  {
    id: 5,
    name: "Orbit Pay",
    plan: "Growth",
    owner: "Maya Chen",
    score: 54,
    lastTouch: "2026-06-29",
  },
  {
    id: 6,
    name: "Lumen Schools",
    plan: "Enterprise",
    owner: "Alex Kim",
    score: 88,
    lastTouch: "2026-07-15",
  },
  {
    id: 7,
    name: "Harbor Retail",
    plan: "Growth",
    owner: "Jordan Lee",
    score: 29,
    lastTouch: "2026-05-30",
  },
  {
    id: 8,
    name: "Summit Analytics",
    plan: "Starter",
    owner: "Sam Ortiz",
    score: 71,
    lastTouch: "2026-07-08",
  },
];

/** What the user currently has selected */
const state = {
  search: "",
  status: "all", // "all" | "healthy" | "at-risk" | "critical"
};

/** Turn a number score into a status label */
function getStatus(score) {
  if (score >= 75) return "healthy";
  if (score >= 50) return "at-risk";
  return "critical";
}

/** Friendly label for the badge text */
function statusLabel(status) {
  if (status === "at-risk") return "At risk";
  if (status === "critical") return "Critical";
  return "Healthy";
}

/** Format YYYY-MM-DD into something easier to read */
function formatDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Apply search + status filters */
function getFilteredCustomers() {
  const query = state.search.trim().toLowerCase();

  return customers.filter((customer) => {
    const status = getStatus(customer.score);
    const matchesStatus = state.status === "all" || status === state.status;
    const matchesSearch =
      query === "" ||
      customer.name.toLowerCase().includes(query) ||
      customer.owner.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });
}

/** Draw the four summary numbers at the top */
function renderStats() {
  const total = customers.length;
  const healthy = customers.filter((c) => getStatus(c.score) === "healthy").length;
  const atRisk = customers.filter((c) => getStatus(c.score) === "at-risk").length;
  const critical = customers.filter((c) => getStatus(c.score) === "critical").length;

  const average = Math.round(
    customers.reduce((sum, customer) => sum + customer.score, 0) / total
  );

  const row = document.getElementById("stat-row");
  row.innerHTML = `
    <article class="stat">
      <p class="stat-label">Customers</p>
      <p class="stat-value">${total}</p>
    </article>
    <article class="stat">
      <p class="stat-label">Avg health</p>
      <p class="stat-value">${average}</p>
    </article>
    <article class="stat">
      <p class="stat-label">Healthy / At risk</p>
      <p class="stat-value">${healthy} / ${atRisk}</p>
    </article>
    <article class="stat">
      <p class="stat-label">Critical</p>
      <p class="stat-value">${critical}</p>
    </article>
  `;
}

/** Draw one table row for a customer */
function customerRowHtml(customer) {
  const status = getStatus(customer.score);

  return `
    <tr>
      <td>
        <p class="customer-name">${customer.name}</p>
        <p class="customer-plan">${customer.plan}</p>
      </td>
      <td>${customer.owner}</td>
      <td class="health-cell">
        <div class="health-bar">
          <span class="health-score">${customer.score}</span>
          <div class="health-track" aria-hidden="true">
            <div
              class="health-fill is-${status}"
              style="width: ${customer.score}%"
            ></div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge ${status}">${statusLabel(status)}</span>
      </td>
      <td>${formatDate(customer.lastTouch)}</td>
    </tr>
  `;
}

/** Draw the filtered customer table */
function renderTable() {
  const filtered = getFilteredCustomers();
  const tbody = document.getElementById("customer-tbody");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("result-count");

  count.textContent =
    filtered.length === 1
      ? "1 customer"
      : `${filtered.length} customers`;

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  tbody.innerHTML = filtered.map(customerRowHtml).join("");
}

/** Re-draw anything that depends on filters */
function render() {
  renderTable();
}

/** Wire up search box + filter chips */
function setupEvents() {
  const searchInput = document.getElementById("search-input");
  const filterRow = document.getElementById("status-filters");

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    state.status = button.dataset.status;

    filterRow.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });

    render();
  });
}

/** Kick everything off when the page loads */
function init() {
  renderStats();
  setupEvents();
  render();
}

init();
