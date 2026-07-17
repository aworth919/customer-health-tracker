/* ============================================================
   Pulse — app logic (JavaScript)
   This file:
   1. Holds mock customer data (and saves it in the browser)
   2. Figures out health status from a score
   3. Draws the summary + table
   4. Listens for search / filter clicks
   5. Handles the “Add customer” form
   6. Switches between list view and detail view
   7. Persists customers with localStorage
   8. Edits score drivers on the detail page
   9. Imports real customers from a Looker CSV
  10. Sorts the customer table by column
  11. Writes current-state + next-steps copy on the detail page
   ============================================================ */

/** @typedef {"healthy" | "at-risk" | "critical"} HealthStatus */

/** Key used in the browser’s localStorage */
const STORAGE_KEY = "pulse-customers-v1";

/**
 * Starter mock data — used the first time (or after a reset).
 * Pretend this came from Looker / Gong / CRM.
 */
const SEED_CUSTOMERS = [
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

/** Deep-copy the seed list so we never mutate the original by accident */
function cloneSeedCustomers() {
  return JSON.parse(JSON.stringify(SEED_CUSTOMERS));
}

/** Make sure older/partial saved rows still have factors */
function normalizeCustomer(customer) {
  const lastTouch = customer.lastTouch || todayIsoDate();
  const score = Number(customer.score);

  return {
    id: Number(customer.id),
    name: String(customer.name || "Untitled"),
    plan: String(customer.plan || "Starter"),
    owner: String(customer.owner || "Unassigned"),
    score: Number.isFinite(score) ? score : 0,
    lastTouch,
    factors: customer.factors || buildFactorsFromScore(score || 0, lastTouch),
  };
}

/** Load from localStorage, or fall back to the seed list */
function loadCustomers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSeedCustomers();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return cloneSeedCustomers();
    }

    return parsed.map(normalizeCustomer);
  } catch (error) {
    console.warn("Could not load saved customers; using seed data.", error);
    return cloneSeedCustomers();
  }
}

/** Save the current list so it survives a refresh */
function saveCustomers() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

/** Working list — starts from storage or seed */
let customers = loadCustomers();

/** What the user currently has selected */
const state = {
  search: "",
  status: "all", // "all" | "healthy" | "at-risk" | "critical"
  selectedId: null, // null = list view; number = detail view
  sortBy: "name", // "name" | "owner" | "health" | "status" | "lastTouch"
  sortDir: "asc", // "asc" | "desc"
};

/** Status severity order for sorting (critical first when ascending) */
const STATUS_RANK = {
  critical: 0,
  "at-risk": 1,
  healthy: 2,
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

/**
 * Find the weakest score driver so we can mention it in plain language.
 * Returns { key, label, value } or null if factors are missing.
 */
function weakestFactor(factors) {
  if (!factors) return null;

  let weakest = null;
  FACTOR_META.forEach((meta) => {
    const value = Number(factors[meta.key]);
    if (Number.isNaN(value)) return;
    if (!weakest || value < weakest.value) {
      weakest = { key: meta.key, label: meta.label, value };
    }
  });
  return weakest;
}

/**
 * Build ~2 sentences describing where this customer stands today.
 * Uses score/status plus optional Looker fields (health label, risk, tickets, etc.).
 * Generated on render — not stored in localStorage.
 *
 * @param {object} customer
 * @param {{ score?: number, factors?: object }} [overrides] — used while editing drivers live
 */
function currentStateSummary(customer, overrides = {}) {
  const score = overrides.score ?? customer.score;
  const factors = overrides.factors ?? customer.factors;
  const status = getStatus(score);
  const meetingDays = daysSince(factors?.lastMeeting || customer.lastTouch);
  const openTickets = Number(customer.supportTicketsOpen) || 0;
  const weakest = weakestFactor(factors);

  // Sentence 1: overall health (prefer Looker label when present)
  let sentence1;
  if (customer.healthLabel) {
    sentence1 = `${customer.name} is marked ${customer.healthLabel} in Looker with a Pulse score of ${score} (${statusLabel(status).toLowerCase()}).`;
  } else if (status === "critical") {
    sentence1 = `${customer.name} is in critical shape with a health score of ${score}, so retention needs attention soon.`;
  } else if (status === "at-risk") {
    sentence1 = `${customer.name} is at risk with a health score of ${score} — solid enough to recover, but not yet stable.`;
  } else {
    sentence1 = `${customer.name} looks healthy with a score of ${score}, and the account is tracking in a good place.`;
  }

  // Sentence 2: supporting context (risk notes, tickets, meetings, weak driver)
  const bits = [];
  if (customer.riskState) {
    bits.push(`risk state is “${customer.riskState}”`);
  }
  if (customer.riskReason) {
    bits.push(`notes mention ${customer.riskReason.replace(/\.$/, "")}`);
  }
  if (openTickets > 0) {
    bits.push(`${openTickets} support ticket${openTickets === 1 ? "" : "s"} still open`);
  }
  if (meetingDays >= 21) {
    bits.push(`last meeting was ${meetingDays} days ago`);
  } else if (meetingDays <= 7 && status === "healthy") {
    bits.push(`last meeting was only ${meetingDays} day${meetingDays === 1 ? "" : "s"} ago`);
  }
  if (weakest && weakest.value < 70) {
    bits.push(`${weakest.label.toLowerCase()} is the softest driver at ${weakest.value}`);
  }
  if (customer.productsInUse) {
    bits.push(`products in use include ${customer.productsInUse}`);
  }

  let sentence2;
  if (bits.length >= 2) {
    sentence2 = `Right now, ${bits[0]}, and ${bits[1]}.`;
  } else if (bits.length === 1) {
    sentence2 = `Right now, ${bits[0]}.`;
  } else if (status === "critical") {
    sentence2 = `Engagement and adoption both look thin, so this account needs a clear recovery plan.`;
  } else if (status === "at-risk") {
    sentence2 = `A few drivers are lagging, so a focused check-in should clarify what is blocking progress.`;
  } else {
    sentence2 = `Usage and engagement look solid, so the main job is protecting momentum and spotting expansion.`;
  }

  return `${sentence1} ${sentence2}`;
}

/**
 * Build ~2 sentences of recommended next steps for CS.
 * Expands the old one-liner helper with richer, status-aware guidance
 * and light personalization from tickets / risk / expansion flags.
 *
 * @param {object} customer
 * @param {{ score?: number, factors?: object }} [overrides]
 */
function recommendedNextSteps(customer, overrides = {}) {
  const score = overrides.score ?? customer.score;
  const factors = overrides.factors ?? customer.factors;
  const status = getStatus(score);
  const openTickets = Number(customer.supportTicketsOpen) || 0;
  const weakest = weakestFactor(factors);
  const meetingDays = daysSince(factors?.lastMeeting || customer.lastTouch);

  let sentence1;
  let sentence2;

  if (status === "critical") {
    sentence1 =
      "Schedule an executive business review this week and confirm renewal risks with the AE.";
    if (customer.riskReason) {
      sentence2 = `Bring a written plan that directly addresses “${customer.riskReason.replace(/\.$/, "")},” and agree on owners and dates before you leave the call.`;
    } else if (openTickets > 0) {
      sentence2 = `Clear the ${openTickets} open support ticket${openTickets === 1 ? "" : "s"} first so the conversation can focus on value, not firefighting.`;
    } else {
      sentence2 =
        "Align on one recovery plan with clear owners, then send a short written summary the same day.";
    }
  } else if (status === "at-risk") {
    sentence1 =
      "Book a check-in within the next two weeks, review adoption gaps, and leave with one quick win.";
    if (weakest && weakest.value < 65) {
      sentence2 = `Prioritize lifting ${weakest.label.toLowerCase()} (currently ${weakest.value}) with a concrete enablement or usage goal.`;
    } else if (meetingDays >= 21) {
      sentence2 = `Re-establish cadence — it has been ${meetingDays} days since the last meeting — and confirm the next touch before you hang up.`;
    } else if (openTickets > 0) {
      sentence2 = `Triage the ${openTickets} open ticket${openTickets === 1 ? "" : "s"} so friction is not quietly eroding trust.`;
    } else {
      sentence2 =
        "Share one success path they can copy, then set a follow-up to confirm it stuck.";
    }
  } else {
    sentence1 =
      "Keep the current cadence: share a recent success story and ask how else LaunchDarkly can help.";
    if (customer.hasExpansion) {
      sentence2 =
        "There is an open expansion opportunity — partner with the AE on timing and who to involve next.";
    } else if (customer.productsInUse && /experimentation/i.test(customer.productsInUse) === false) {
      sentence2 =
        "Ask whether Experimentation or a deeper feature set could unlock more value, and offer a short intro if they are curious.";
    } else {
      sentence2 =
        "Ask for a referral or case study while momentum is strong, and note any expansion signals for the AE.";
    }
  }

  return `${sentence1} ${sentence2}`;
}

/** Format YYYY-MM-DD into something easier to read */
function formatDate(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Days since last touch (rough, for the detail view) */
function daysSince(isoDate) {
  if (!isoDate) return 0;
  const then = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(then.getTime())) return 0;
  const now = new Date();
  const ms = now - then;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
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

/** Compare two customers using the current sort settings */
function compareCustomers(a, b) {
  const dir = state.sortDir === "asc" ? 1 : -1;
  let result = 0;

  if (state.sortBy === "owner") {
    result = a.owner.localeCompare(b.owner, undefined, { sensitivity: "base" });
  } else if (state.sortBy === "health") {
    result = a.score - b.score;
  } else if (state.sortBy === "status") {
    result = STATUS_RANK[getStatus(a.score)] - STATUS_RANK[getStatus(b.score)];
  } else if (state.sortBy === "lastTouch") {
    result = String(a.lastTouch || "").localeCompare(String(b.lastTouch || ""));
  } else {
    result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }

  if (result === 0) {
    result = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  }

  return result * dir;
}

/** Filter, then sort, for the table */
function getVisibleCustomers() {
  return getFilteredCustomers().sort(compareCustomers);
}

/** Update sort button arrows / active styles */
function renderSortHeaders() {
  document.querySelectorAll(".sort-btn").forEach((button) => {
    const isActive = button.dataset.sort === state.sortBy;
    button.classList.toggle("is-active", isActive);
    button.dataset.direction = isActive ? state.sortDir : "";

    const label = button.textContent.replace(/[↑↓]\s*$/, "").trim();
    if (isActive) {
      button.textContent = `${label} ${state.sortDir === "asc" ? "↑" : "↓"}`;
      button.setAttribute(
        "aria-sort",
        state.sortDir === "asc" ? "ascending" : "descending"
      );
    } else {
      button.textContent = label;
      button.removeAttribute("aria-sort");
    }
  });
}

/** Click a header: same column toggles direction; new column starts asc */
function handleSortClick(event) {
  const button = event.target.closest("button[data-sort]");
  if (!button) return;

  const nextSort = button.dataset.sort;
  if (state.sortBy === nextSort) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortBy = nextSort;
    state.sortDir = "asc";
  }

  renderTable();
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

/** Overall health = average of the four numeric drivers */
function scoreFromFactors(factors) {
  const values = [
    Number(factors.usage),
    Number(factors.basicAdoption),
    Number(factors.deepAdoption),
    Number(factors.engagement),
  ];

  if (values.some((value) => Number.isNaN(value))) return 0;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Keep a factor score between 0 and 100 */
function clampScore(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

/** Split a CSV cell like "Enterprise, Experimentation" into parts */
function splitList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Parse CSV text into an array of row arrays.
 * Handles quoted fields and commas inside quotes (common in Looker exports).
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignore; handle \r\n via the \n branch
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((parts) => parts.some((part) => String(part).trim() !== ""));
}

/** Turn parsed CSV rows into objects using the header row */
function csvRowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).map((parts) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = parts[index] ?? "";
    });
    return record;
  });
}

/** Map Looker Green/Yellow/Red into a 0–100 score */
function healthLabelToScore(label, riskState) {
  const normalized = String(label || "")
    .trim()
    .toLowerCase();

  if (normalized === "green") return 86;
  if (normalized === "yellow") return 58;
  if (normalized === "red") return 28;

  const risk = String(riskState || "").toLowerCase();
  if (risk.includes("risk")) return 42;
  if (risk.includes("adoption")) return 55;
  if (risk.includes("on board")) return 60;
  return 62;
}

/** Prefer YYYY-MM-DD; otherwise return empty */
function normalizeIsoDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return "";
}

/**
 * Estimate adoption/engagement drivers from Looker columns.
 * Starts from the health color score, then nudges with product + ticket signals.
 */
function factorsFromCsvRow(row, score, lastMeeting) {
  const base = buildFactorsFromScore(score, lastMeeting);
  const products = splitList(row.products_in_use);
  const primary = splitList(row.primary_use_cases);
  const secondary = splitList(row.secondary_use_cases);
  const openTickets = Number(row.support_tickets_open) || 0;
  const totalTickets = Number(row.support_tickets_total) || 0;
  const hasDeepProducts = products.some((product) =>
    /experimentation|data export|guarded releases/i.test(product)
  );

  return {
    usage: clampScore(base.usage - Math.min(15, openTickets * 3) + Math.min(8, totalTickets / 5)),
    basicAdoption: clampScore(45 + primary.length * 12 + (products.length ? 8 : 0)),
    deepAdoption: clampScore(
      20 + secondary.length * 14 + (hasDeepProducts ? 28 : 0) + Math.max(0, products.length - 1) * 8
    ),
    engagement: clampScore(base.engagement - openTickets * 4),
    lastMeeting,
  };
}

/** Convert one Looker CSV row into our app’s customer shape */
function mapCsvRowToCustomer(row, index) {
  const healthLabel = String(row.customer_health_score || "").trim();
  const score = healthLabelToScore(healthLabel, row.risk_profile_current_state);
  const lastMeeting =
    normalizeIsoDate(row.last_meeting_date) ||
    normalizeIsoDate(row.last_sales_touch_date) ||
    todayIsoDate();

  return {
    id: index + 1,
    name: String(row.customer_name || "Untitled account").trim(),
    plan: String(row.account_rating || "Enterprise").trim() || "Enterprise",
    owner: String(row.csm || row.ae_name || "Unassigned").trim(),
    score,
    lastTouch: lastMeeting,
    factors: factorsFromCsvRow(row, score, lastMeeting),
    healthLabel: healthLabel || "Unknown",
    aeName: String(row.ae_name || "").trim(),
    riskState: String(row.risk_profile_current_state || "").trim(),
    riskReason: String(row.risk_profile_reason || "").trim(),
    productsInUse: String(row.products_in_use || "").trim(),
    primaryUseCases: String(row.primary_use_cases || "").trim(),
    arr: String(row.arr || "").trim(),
    renewalDate: normalizeIsoDate(row.renewal_date),
    supportTicketsOpen: Number(row.support_tickets_open) || 0,
    supportTicketsTotal: Number(row.support_tickets_total) || 0,
    hasExpansion: String(row.has_open_expansion_opportunity || "").toLowerCase() === "yes",
  };
}

/** Extra Looker fields on the detail page (when present) */
function csvExtrasHtml(customer) {
  if (!customer.healthLabel && !customer.arr && !customer.riskReason) {
    return "";
  }

  const renewal = customer.renewalDate
    ? formatDate(customer.renewalDate)
    : "—";

  return `
    <section class="account-insights" aria-label="Account insights">
      <div class="score-drivers-copy">
        <h2>Account insights from Looker</h2>
        <p>Imported fields from your enterprise plan export.</p>
      </div>
      <div class="insight-grid">
        <article class="detail-stat">
          <p class="stat-label">Looker health</p>
          <p class="stat-value detail-stat-small">${escapeHtml(customer.healthLabel || "—")}</p>
        </article>
        <article class="detail-stat">
          <p class="stat-label">ARR</p>
          <p class="stat-value detail-stat-small">${escapeHtml(customer.arr || "—")}</p>
        </article>
        <article class="detail-stat">
          <p class="stat-label">Renewal</p>
          <p class="stat-value detail-stat-small">${escapeHtml(renewal)}</p>
        </article>
        <article class="detail-stat">
          <p class="stat-label">Support tickets</p>
          <p class="stat-value detail-stat-small">${customer.supportTicketsOpen || 0} open</p>
          <p class="detail-meta">${customer.supportTicketsTotal || 0} total</p>
        </article>
      </div>
      <dl class="insight-list">
        <div>
          <dt>AE</dt>
          <dd>${escapeHtml(customer.aeName || "—")}</dd>
        </div>
        <div>
          <dt>Products in use</dt>
          <dd>${escapeHtml(customer.productsInUse || "—")}</dd>
        </div>
        <div>
          <dt>Primary use cases</dt>
          <dd>${escapeHtml(customer.primaryUseCases || "—")}</dd>
        </div>
        <div>
          <dt>Risk state</dt>
          <dd>${escapeHtml(customer.riskState || "—")}</dd>
        </div>
        <div class="insight-wide">
          <dt>Risk notes</dt>
          <dd>${escapeHtml(customer.riskReason || "—")}</dd>
        </div>
        <div>
          <dt>Expansion opportunity</dt>
          <dd>${customer.hasExpansion ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </section>
  `;
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

/** One editable row in the score-drivers form */
function factorRowHtml(meta, value) {
  const status = getStatus(value);

  return `
    <div class="factor-row">
      <div class="factor-copy">
        <label class="factor-label" for="factor-${meta.key}">
          ${escapeHtml(meta.label)}
        </label>
        <p class="factor-source">${escapeHtml(meta.source)}</p>
      </div>
      <div class="factor-meter">
        <input
          class="factor-input"
          type="number"
          id="factor-${meta.key}"
          name="${meta.key}"
          data-factor="${meta.key}"
          min="0"
          max="100"
          value="${value}"
          required
        />
        <div class="health-track" aria-hidden="true">
          <div
            class="health-fill is-${status}"
            data-factor-fill="${meta.key}"
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

/** Draw the filtered + sorted customer table */
function renderTable() {
  const visible = getVisibleCustomers();
  const tbody = document.getElementById("customer-tbody");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("result-count");

  count.textContent =
    visible.length === 1
      ? "1 customer"
      : `${visible.length} customers`;

  renderSortHeaders();

  if (visible.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  tbody.innerHTML = visible.map(customerRowHtml).join("");
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
    factorRowHtml(meta, factors[meta.key])
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
      <span class="badge ${status}" id="detail-status-badge">${statusLabel(status)}</span>
    </div>

    <div class="detail-grid">
      <article class="detail-stat">
        <p class="stat-label">Health score</p>
        <p class="stat-value" id="detail-score-value">${customer.score}</p>
        <div class="health-track detail-track" aria-hidden="true">
          <div
            class="health-fill is-${status}"
            id="detail-score-fill"
            style="width: ${customer.score}%"
          ></div>
        </div>
        <p class="detail-meta">From Looker health color + drivers below</p>
      </article>
      <article class="detail-stat">
        <p class="stat-label">Last touch</p>
        <p class="stat-value detail-stat-small">${formatDate(customer.lastTouch)}</p>
        <p class="detail-meta">${age} day${age === 1 ? "" : "s"} ago</p>
      </article>
      <article class="detail-stat">
        <p class="stat-label">Last meeting</p>
        <p class="stat-value detail-stat-small" id="detail-meeting-label">${formatDate(factors.lastMeeting)}</p>
        <p class="detail-meta" id="detail-meeting-meta">${meetingAge} day${meetingAge === 1 ? "" : "s"} ago · Gong / calendar</p>
      </article>
    </div>

    ${csvExtrasHtml(customer)}

    <section class="detail-summaries" aria-label="Customer summaries">
      <article class="detail-guidance detail-guidance-state">
        <h2>Current state of customer</h2>
        <p id="detail-state-text">${escapeHtml(currentStateSummary(customer))}</p>
      </article>
      <article class="detail-guidance detail-guidance-next">
        <h2>Recommended next steps</h2>
        <p id="detail-guidance-text">${escapeHtml(recommendedNextSteps(customer))}</p>
      </article>
    </section>

    <section class="score-drivers" aria-label="Health score drivers">
      <div class="score-drivers-copy">
        <h2>Edit score drivers</h2>
        <p>
          Drivers start from your CSV (health color, products, tickets). Edit
          them here; saving stores the update in this browser only.
        </p>
      </div>
      <form id="edit-factors-form" class="factors-form">
        <div class="factor-list">
          ${factorRows}
        </div>
        <label class="meeting-field">
          <span class="label">Last meeting date</span>
          <input
            type="date"
            name="lastMeeting"
            value="${escapeHtml(factors.lastMeeting)}"
            required
          />
        </label>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save drivers</button>
          <p class="form-hint" id="factors-save-hint" hidden>Saved.</p>
        </div>
      </form>
    </section>
  `;
}

/** Read current form values into a factors object */
function readFactorsFromForm(form) {
  const data = new FormData(form);

  return {
    usage: clampScore(data.get("usage")),
    basicAdoption: clampScore(data.get("basicAdoption")),
    deepAdoption: clampScore(data.get("deepAdoption")),
    engagement: clampScore(data.get("engagement")),
    lastMeeting: String(data.get("lastMeeting") || todayIsoDate()),
  };
}

/** Live-update bars + overall score while typing (before save) */
function previewFactorEdits(form) {
  const factors = readFactorsFromForm(form);
  const score = scoreFromFactors(factors);
  const status = getStatus(score);

  FACTOR_META.forEach((meta) => {
    const value = factors[meta.key];
    const fill = form.querySelector(`[data-factor-fill="${meta.key}"]`);
    if (!fill) return;
    fill.style.width = `${value}%`;
    fill.className = `health-fill is-${getStatus(value)}`;
  });

  const scoreValue = document.getElementById("detail-score-value");
  const scoreFill = document.getElementById("detail-score-fill");
  const badge = document.getElementById("detail-status-badge");
  const stateText = document.getElementById("detail-state-text");
  const guidance = document.getElementById("detail-guidance-text");
  const meetingLabel = document.getElementById("detail-meeting-label");
  const meetingMeta = document.getElementById("detail-meeting-meta");

  // Rebuild summaries with the in-progress driver edits (before Save)
  const customer = getCustomerById(state.selectedId);
  const summaryOverrides = { score, factors };

  if (scoreValue) scoreValue.textContent = String(score);
  if (scoreFill) {
    scoreFill.style.width = `${score}%`;
    scoreFill.className = `health-fill is-${status}`;
  }
  if (badge) {
    badge.textContent = statusLabel(status);
    badge.className = `badge ${status}`;
  }
  if (customer && stateText) {
    stateText.textContent = currentStateSummary(customer, summaryOverrides);
  }
  if (customer && guidance) {
    guidance.textContent = recommendedNextSteps(customer, summaryOverrides);
  }

  if (meetingLabel && meetingMeta && factors.lastMeeting) {
    const meetingAge = daysSince(factors.lastMeeting);
    meetingLabel.textContent = formatDate(factors.lastMeeting);
    meetingMeta.textContent = `${meetingAge} day${meetingAge === 1 ? "" : "s"} ago · Gong / calendar`;
  }
}

/** Save edited drivers onto the selected customer */
function handleSaveFactors(event) {
  event.preventDefault();

  const customer = getCustomerById(state.selectedId);
  if (!customer) return;

  const form = event.target;
  const factors = readFactorsFromForm(form);

  customer.factors = factors;
  customer.score = scoreFromFactors(factors);
  customer.lastTouch = todayIsoDate();

  saveCustomers();
  renderDetail();
  renderStats();

  const hint = document.getElementById("factors-save-hint");
  if (hint) {
    hint.hidden = false;
    window.setTimeout(() => {
      hint.hidden = true;
    }, 2000);
  }
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

  saveCustomers();

  form.reset();
  form.elements.score.value = "70";

  const hint = document.getElementById("form-hint");
  hint.hidden = false;
  window.setTimeout(() => {
    hint.hidden = true;
  }, 2000);

  render();
}

/** Wipe saved data and restore the original 8 mock customers */
function resetDemoData() {
  const confirmed = window.confirm(
    "Reset to the original demo customers? This clears anything you added."
  );
  if (!confirmed) return;

  customers = cloneSeedCustomers();
  state.selectedId = null;
  state.search = "";
  state.status = "all";
  saveCustomers();

  const searchInput = document.getElementById("search-input");
  searchInput.value = "";

  document.querySelectorAll("#status-filters .chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.status === "all");
  });

  render();
}

/** Import a Looker CSV selected by the user */
function handleCsvFile(event) {
  const file = event.target.files && event.target.files[0];
  const hint = document.getElementById("import-hint");
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const objects = csvRowsToObjects(parseCsv(text));

      if (!objects.length) {
        throw new Error("No data rows found in that CSV.");
      }

      if (!("customer_name" in objects[0])) {
        throw new Error("Could not find a customer_name column.");
      }

      customers = objects.map(mapCsvRowToCustomer);
      state.selectedId = null;
      state.search = "";
      state.status = "all";
      saveCustomers();

      const searchInput = document.getElementById("search-input");
      searchInput.value = "";
      document.querySelectorAll("#status-filters .chip").forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.status === "all");
      });

      render();

      hint.hidden = false;
      hint.textContent = `Imported ${customers.length} customers from ${file.name}.`;
    } catch (error) {
      console.warn(error);
      hint.hidden = false;
      hint.textContent = error.message || "Could not import that CSV.";
    } finally {
      event.target.value = "";
    }
  };

  reader.onerror = () => {
    hint.hidden = false;
    hint.textContent = "Could not read that file.";
    event.target.value = "";
  };

  reader.readAsText(file);
}

/** Wire up search, filters, form, row clicks, back, and reset */
function setupEvents() {
  const searchInput = document.getElementById("search-input");
  const filterRow = document.getElementById("status-filters");
  const addForm = document.getElementById("add-customer-form");
  const tbody = document.getElementById("customer-tbody");
  const backButton = document.getElementById("back-to-list");
  const resetButton = document.getElementById("reset-demo-data");
  const csvInput = document.getElementById("csv-file-input");
  const sortHeaders = document.getElementById("customer-sort-headers");

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
  csvInput.addEventListener("change", handleCsvFile);
  sortHeaders.addEventListener("click", handleSortClick);

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
  resetButton.addEventListener("click", resetDemoData);

  // Detail form is re-created when the view opens, so we listen on the parent
  const detailView = document.getElementById("detail-view");

  detailView.addEventListener("submit", (event) => {
    if (event.target.id !== "edit-factors-form") return;
    handleSaveFactors(event);
  });

  detailView.addEventListener("input", (event) => {
    const form = event.target.closest("#edit-factors-form");
    if (!form) return;
    previewFactorEdits(form);
  });
}

/** Kick everything off when the page loads */
function init() {
  setupEvents();
  render();
}

init();
