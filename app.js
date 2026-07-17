/* ============================================================
   Pulse — app logic (JavaScript)
   This file:
   1. Holds mock customer data
   2. Figures out health status from a score
   3. Draws the summary + table
   4. Listens for search / filter clicks
   5. Handles the “Add customer” form
   6. Switches between list view and detail view
   ============================================================ */

/** @typedef {"healthy" | "at-risk" | "critical"} HealthStatus */

/**
 * Mock customers — pretend this came from Looker / Gong / CRM.
 * score: overall health 0–100
 * factors: the inputs that make up that score (mock)
 */
const customers = [
  {
    id: 1,
    name: "Acme Robotics",
    plan: "Enterprise",
    owner: "Maya Chen",
    score: 92,
    lastTouch: "2026-07-14",
    factors: {
      usage: 94,
      basicAdoption: 96,
      deepAdoption: 88,
      engagement: 90,
      lastMeeting: "2026-07-10",
    },
  },
  {
    id: 2,
    name: "Nova Health",
    plan: "Growth",
    owner: "Jordan Lee",
    score: 61,
    lastTouch: "2026-07-02",
    factors: {
      usage: 68,
      basicAdoption: 72,
      deepAdoption: 48,
      engagement: 55,
      lastMeeting: "2026-06-20",
    },
  },
  {
    id: 3,
    name: "Brightline Logistics",
    plan: "Enterprise",
    owner: "Sam Ortiz",
    score: 38,
    lastTouch: "2026-06-18",
    factors: {
      usage: 42,
      basicAdoption: 55,
      deepAdoption: 22,
      engagement: 30,
      lastMeeting: "2026-05-12",
    },
  },
  {
    id: 4,
    name: "Cedar & Co",
    plan: "Starter",
    owner: "Priya Shah",
    score: 78,
    lastTouch: "2026-07-12",
    factors: {
      usage: 80,
      basicAdoption: 85,
      deepAdoption: 70,
      engagement: 76,
      lastMeeting: "2026-07-08",
    },
  },
  {
    id: 5,
    name: "Orbit Pay",
    plan: "Growth",
    owner: "Maya Chen",
    score: 54,
    lastTouch: "2026-06-29",
    factors: {
      usage: 58,
      basicAdoption: 64,
      deepAdoption: 40,
      engagement: 52,
      lastMeeting: "2026-06-05",
    },
  },
  {
    id: 6,
    name: "Lumen Schools",
    plan: "Enterprise",
    owner: "Alex Kim",
    score: 88,
    lastTouch: "2026-07-15",
    factors: {
      usage: 91,
      basicAdoption: 93,
      deepAdoption: 82,
      engagement: 86,
      lastMeeting: "2026-07-14",
    },
  },
  {
    id: 7,
    name: "Harbor Retail",
    plan: "Growth",
    owner: "Jordan Lee",
    score: 29,
    lastTouch: "2026-05-30",
    factors: {
      usage: 25,
      basicAdoption: 40,
      deepAdoption: 12,
      engagement: 28,
      lastMeeting: "2026-04-18",
    },
  },
  {
    id: 8,
    name: "Summit Analytics",
    plan: "Starter",
    owner: "Sam Ortiz",
    score: 71,
    lastTouch: "2026-07-08",
    factors: {
      usage: 74,
      basicAdoption: 78,
      deepAdoption: 60,
      engagement: 69,
      lastMeeting: "2026-06-28",
    },
  },
];

/** What the user currently has selected */
const state = {
  search: "",
  status: "all", // "all" | "healthy" | "at-risk" | "critical"
  selectedId: null, // null = list view; number = detail view
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

/** Simple CS-style next step based on status */
function recommendedAction(status) {
  if (status === "critical") {
    return "Schedule an executive business review this week and confirm renewal risks.";
  }
  if (status === "at-risk") {
    return "Book a check-in, review adoption gaps, and share one quick win.";
  }
  return "Keep the cadence: share a success story and ask for a referral or case study.";
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

/** Days since last touch (rough, for the detail view) */
function daysSince(isoDate) {
  const then = new Date(`${isoDate}T12:00:00`);
  const now = new Date();
  const ms = now - then;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
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

/** Find one customer by id */
function getCustomerById(id) {
  return customers.find((customer) => customer.id === id) || null;
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

/** Keep user-typed text from being treated as HTML */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Today's date as YYYY-MM-DD (for new customers) */
function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Next id so each customer stays unique */
function nextCustomerId() {
  const highest = customers.reduce(
    (max, customer) => Math.max(max, customer.id),
    0
  );
  return highest + 1;
}

/**
 * Build mock score drivers near an overall score.
 * In a real app these would come from Looker / Gong / product analytics.
 */
function buildFactorsFromScore(score, lastMeeting) {
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

  return {
    usage: clamp(score + 4),
    basicAdoption: clamp(score + 8),
    deepAdoption: clamp(score - 12),
    engagement: clamp(score - 2),
    lastMeeting,
  };
}

/** Labels + short “where this might come from” notes for learners */
const FACTOR_META = [
  {
    key: "usage",
    label: "Usage",
    source: "Product analytics / Looker",
  },
  {
    key: "basicAdoption",
    label: "Basic feature adoption",
    source: "Onboarding + core feature flags",
  },
  {
    key: "deepAdoption",
    label: "Deeper adoption",
    source: "Advanced features / workflows",
  },
  {
    key: "engagement",
    label: "Customer engagement",
    source: "Email, in-app, support — Gong for calls",
  },
];

/** One row in the score-drivers list */
function factorRowHtml(label, source, value) {
  const status = getStatus(value);

  return `
    <div class="factor-row">
      <div class="factor-copy">
        <p class="factor-label">${escapeHtml(label)}</p>
        <p class="factor-source">${escapeHtml(source)}</p>
      </div>
      <div class="factor-meter">
        <span class="health-score">${value}</span>
        <div class="health-track" aria-hidden="true">
          <div
            class="health-fill is-${status}"
            style="width: ${value}%"
          ></div>
        </div>
      </div>
    </div>
  `;
}

/** Draw one clickable table row for a customer */
function customerRowHtml(customer) {
  const status = getStatus(customer.score);

  return `
    <tr class="customer-row" data-customer-id="${customer.id}" tabindex="0">
      <td>
        <p class="customer-name">${escapeHtml(customer.name)}</p>
        <p class="customer-plan">${escapeHtml(customer.plan)}</p>
      </td>
      <td>${escapeHtml(customer.owner)}</td>
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

/** Draw the detail panel for the selected customer */
function renderDetail() {
  const content = document.getElementById("detail-content");
  const customer = getCustomerById(state.selectedId);

  if (!customer) {
    content.innerHTML = `
      <p class="detail-missing">Customer not found. Go back to the list.</p>
    `;
    return;
  }

  const status = getStatus(customer.score);
  const age = daysSince(customer.lastTouch);
  const factors = customer.factors;
  const meetingAge = daysSince(factors.lastMeeting);

  const factorRows = FACTOR_META.map((meta) =>
    factorRowHtml(meta.label, meta.source, factors[meta.key])
  ).join("");

  content.innerHTML = `
    <div class="detail-hero">
      <div>
        <p class="section-kicker">Customer detail</p>
        <h1 class="detail-title">${escapeHtml(customer.name)}</h1>
        <p class="detail-subtitle">
          ${escapeHtml(customer.plan)} · owned by ${escapeHtml(customer.owner)}
        </p>
      </div>
      <span class="badge ${status}">${statusLabel(status)}</span>
    </div>

    <div class="detail-grid">
      <article class="detail-stat">
        <p class="stat-label">Health score</p>
        <p class="stat-value">${customer.score}</p>
        <div class="health-track detail-track" aria-hidden="true">
          <div
            class="health-fill is-${status}"
            style="width: ${customer.score}%"
          ></div>
        </div>
      </article>
      <article class="detail-stat">
        <p class="stat-label">Last touch</p>
        <p class="stat-value detail-stat-small">${formatDate(customer.lastTouch)}</p>
        <p class="detail-meta">${age} day${age === 1 ? "" : "s"} ago</p>
      </article>
      <article class="detail-stat">
        <p class="stat-label">Last meeting</p>
        <p class="stat-value detail-stat-small">${formatDate(factors.lastMeeting)}</p>
        <p class="detail-meta">${meetingAge} day${meetingAge === 1 ? "" : "s"} ago · Gong / calendar</p>
      </article>
    </div>

    <section class="score-drivers" aria-label="Health score drivers">
      <div class="score-drivers-copy">
        <h2>What makes up this score</h2>
        <p>
          Mock inputs a CS team might pull from Looker (usage/adoption) and
          Gong (meetings/engagement). In a real system these would feed the
          overall health number.
        </p>
      </div>
      <div class="factor-list">
        ${factorRows}
      </div>
    </section>

    <article class="detail-guidance">
      <h2>Suggested next step</h2>
      <p>${recommendedAction(status)}</p>
    </article>
  `;
}

/**
 * Show either the list or the detail view.
 * This is the “two screens” idea without leaving the page.
 */
function renderViews() {
  const listView = document.getElementById("list-view");
  const detailView = document.getElementById("detail-view");
  const showingDetail = state.selectedId !== null;

  listView.hidden = showingDetail;
  detailView.hidden = !showingDetail;

  if (showingDetail) {
    renderDetail();
  }
}

/** Re-draw list data (and keep the correct view visible) */
function render() {
  renderStats();
  renderTable();
  renderViews();
}

/** Open detail for one customer id */
function openCustomer(id) {
  state.selectedId = id;
  renderViews();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Return to the list */
function closeCustomer() {
  state.selectedId = null;
  renderViews();
}

/** Read the form, add a customer, refresh the page */
function handleAddCustomer(event) {
  // Stop the browser from reloading the page on submit
  event.preventDefault();

  const form = event.target;
  const data = new FormData(form);

  const name = String(data.get("name") || "").trim();
  const plan = String(data.get("plan") || "").trim();
  const owner = String(data.get("owner") || "").trim();
  const score = Number(data.get("score"));

  if (!name || !plan || !owner || Number.isNaN(score)) return;
  if (score < 0 || score > 100) return;

  const lastTouch = todayIsoDate();

  customers.push({
    id: nextCustomerId(),
    name,
    plan,
    owner,
    score,
    lastTouch,
    factors: buildFactorsFromScore(score, lastTouch),
  });

  form.reset();
  form.elements.score.value = "70";

  const hint = document.getElementById("form-hint");
  hint.hidden = false;
  window.setTimeout(() => {
    hint.hidden = true;
  }, 2000);

  render();
}

/** Wire up search, filters, form, row clicks, and back button */
function setupEvents() {
  const searchInput = document.getElementById("search-input");
  const filterRow = document.getElementById("status-filters");
  const addForm = document.getElementById("add-customer-form");
  const tbody = document.getElementById("customer-tbody");
  const backButton = document.getElementById("back-to-list");

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTable();
  });

  filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;

    state.status = button.dataset.status;

    filterRow.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip === button);
    });

    renderTable();
  });

  addForm.addEventListener("submit", handleAddCustomer);

  // Event delegation: one listener for all current + future rows
  tbody.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-customer-id]");
    if (!row) return;
    openCustomer(Number(row.dataset.customerId));
  });

  tbody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("tr[data-customer-id]");
    if (!row) return;
    event.preventDefault();
    openCustomer(Number(row.dataset.customerId));
  });

  backButton.addEventListener("click", closeCustomer);
}

/** Kick everything off when the page loads */
function init() {
  setupEvents();
  render();
}

init();
