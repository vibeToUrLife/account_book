import {
  initFirebase,
  watchAuth,
  signOutUser,
  signUpWithEmailPassword,
  signInWithEmailPassword,
  signInWithGooglePopup,
  userCollections,
  firestoreApi,
} from "./firebase.js";

const {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} = firestoreApi();

const els = {
  authStatus: document.getElementById("authStatus"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  configCard: document.getElementById("configCard"),
  configWarning: document.getElementById("configWarning"),

  authCard: document.getElementById("authCard"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  signUpBtn: document.getElementById("signUpBtn"),
  signInBtn: document.getElementById("signInBtn"),
  googleBtn: document.getElementById("googleBtn"),
  authError: document.getElementById("authError"),

  appContent: document.getElementById("appContent"),
  appError: document.getElementById("appError"),
  undoToast: document.getElementById("undoToast"),
  undoText: document.getElementById("undoText"),
  undoBtn: document.getElementById("undoBtn"),
  confirmToast: document.getElementById("confirmToast"),
  confirmText: document.getElementById("confirmText"),
  confirmYesBtn: document.getElementById("confirmYesBtn"),
  confirmNoBtn: document.getElementById("confirmNoBtn"),

  categoryForm: document.getElementById("categoryForm"),
  categoryName: document.getElementById("categoryName"),
  categoryBudget: document.getElementById("categoryBudget"),
  categoryPeriod: document.getElementById("categoryPeriod"),
  categoryTbody: document.getElementById("categoryTbody"),
  categorySubmitBtn: document.getElementById("categorySubmitBtn"),
  cancelCategoryEdit: document.getElementById("cancelCategoryEdit"),

  budgetMonth: document.getElementById("budgetMonth"),
  budgetScope: document.getElementById("budgetScope"),

  txForm: document.getElementById("txForm"),
  txCategory: document.getElementById("txCategory"),
  txType: document.getElementById("txType"),
  txAmount: document.getElementById("txAmount"),
  txNote: document.getElementById("txNote"),
  txDate: document.getElementById("txDate"),
  txTbody: document.getElementById("txTbody"),
  txSubmitBtn: document.getElementById("txSubmitBtn"),
  cancelTxEdit: document.getElementById("cancelTxEdit"),

  txPageInfo: document.getElementById("txPageInfo"),
  txPrevBtn: document.getElementById("txPrevBtn"),
  txNextBtn: document.getElementById("txNextBtn"),

  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  todayBtn: document.getElementById("todayBtn"),
  noteSuggestions: document.getElementById("noteSuggestions"),
  duplicateWarning: document.getElementById("duplicateWarning"),
  quickRepeatSection: null,
  quickRepeatList: null,
  expenseTrend: document.getElementById("expenseTrend"),
  revenueTrend: document.getElementById("revenueTrend"),
  projectionRow: document.getElementById("projectionRow"),
  dailyAvgExpense: document.getElementById("dailyAvgExpense"),
  projectedExpense: document.getElementById("projectedExpense"),
  daysLeft: document.getElementById("daysLeft"),

  assistantFab: document.getElementById("assistantFab"),
  assistantPanel: document.getElementById("assistantPanel"),
  closeAssistant: document.getElementById("closeAssistant"),
  assistantChat: document.getElementById("assistantChat"),
  assistantInput: document.getElementById("assistantInput"),
  assistantMicBtn: document.getElementById("assistantMicBtn"),
  assistantSendBtn: document.getElementById("assistantSendBtn"),

  statsRange: document.getElementById("statsRange"),
  statsDateField: document.getElementById("statsDateField"),
  statsAnchorDate: document.getElementById("statsAnchorDate"),
  statsMonthField: document.getElementById("statsMonthField"),
  statsMonth: document.getElementById("statsMonth"),
  statsYearField: document.getElementById("statsYearField"),
  statsYear: document.getElementById("statsYear"),
  refreshStatsBtn: document.getElementById("refreshStatsBtn"),
  statsRangeLabel: document.getElementById("statsRangeLabel"),
  statsChart: document.getElementById("statsChart"),
  statsChartMessage: document.getElementById("statsChartMessage"),
  totalExpense: document.getElementById("totalExpense"),
  totalRevenue: document.getElementById("totalRevenue"),
  netTotal: document.getElementById("netTotal"),
  statsTbody: document.getElementById("statsTbody"),

  editTxModal: document.getElementById("editTxModal"),
  editTxForm: document.getElementById("editTxForm"),
  editTxCategory: document.getElementById("editTxCategory"),
  editTxType: document.getElementById("editTxType"),
  editTxAmount: document.getElementById("editTxAmount"),
  editTxNote: document.getElementById("editTxNote"),
  editTxDate: document.getElementById("editTxDate"),
  editTxSaveBtn: document.getElementById("editTxSaveBtn"),
  editTxCancelBtn: document.getElementById("editTxCancelBtn"),
  closeEditModal: document.getElementById("closeEditModal"),

  autoCategorySuggestion: document.getElementById("autoCategorySuggestion"),
  scanReceiptBtn: document.getElementById("scanReceiptBtn"),
  receiptModal: document.getElementById("receiptModal"),
  closeReceiptModal: document.getElementById("closeReceiptModal"),
  receiptVideo: document.getElementById("receiptVideo"),
  receiptCanvas: document.getElementById("receiptCanvas"),
  receiptPreview: document.getElementById("receiptPreview"),
  receiptCameraBtn: document.getElementById("receiptCameraBtn"),
  receiptFileInput: document.getElementById("receiptFileInput"),
  receiptCaptureBtn: document.getElementById("receiptCaptureBtn"),
  receiptStatus: document.getElementById("receiptStatus"),
  receiptResult: document.getElementById("receiptResult"),
  receiptAmountResult: document.getElementById("receiptAmountResult"),
  receiptTextResult: document.getElementById("receiptTextResult"),
  receiptApplyBtn: document.getElementById("receiptApplyBtn"),
  receiptRetryBtn: document.getElementById("receiptRetryBtn"),
  insightsContent: document.getElementById("insightsContent"),
  refreshInsightsBtn: document.getElementById("refreshInsightsBtn"),
};

let ChartJs = null;
let ChartJsRegistered = false;
let statsChartInstance = null;
let editingCategoryId = null;
let editingTransactionId = null;
let lastUsedCategoryId = null;

async function ensureChartJs() {
  if (ChartJs) return ChartJs;

  // Prefer global Chart if available (e.g. UMD build loaded via <script>).
  if (typeof globalThis !== "undefined" && globalThis.Chart) {
    ChartJs = globalThis.Chart;
    return ChartJs;
  }

  const urls = [
    // Chart.js ESM build (requires registering components)
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js",
    // ESM CDN fallback
    "https://esm.sh/chart.js@4.4.1",
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const mod = await import(url);
      const Chart = mod.Chart || mod.default;
      if (!Chart) continue;
      ChartJs = Chart;

      if (!ChartJsRegistered && mod.registerables && typeof Chart.register === "function") {
        Chart.register(...mod.registerables);
        ChartJsRegistered = true;
      }

      return ChartJs;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error("Failed to load Chart.js");
}

function setStatsChartMessage(message) {
  if (!els.statsChartMessage || !els.statsChart) return;
  const msg = (message || "").trim();
  if (!msg) {
    els.statsChartMessage.hidden = true;
    els.statsChart.style.visibility = "visible";
    return;
  }

  els.statsChartMessage.textContent = msg;
  els.statsChartMessage.hidden = false;
  els.statsChart.style.visibility = "hidden";
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const THEME_KEY = "accountBook.theme";

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalized;
  try {
    localStorage.setItem(THEME_KEY, normalized);
  } catch {
    // ignore storage failures
  }

  const isDark = normalized === "dark";
  if (els.themeToggleBtn) {
    els.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
    els.themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
    els.themeToggleBtn.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  }

  // Update chart colors to match the theme.
  renderStats();
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    saved = null;
  }

  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
    return;
  }

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}

function money(n) {
  const v = Number(n || 0);
  return v.toFixed(2);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateObjToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentMonthValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function budgetMonthRefDate() {
  const monthValue = els.budgetMonth.value || currentMonthValue();
  const [y, m] = monthValue.split("-").map((x) => Number(x));
  const d = new Date(y, (m || 1) - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parsePositiveAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function normalizeText(s) {
  return String(s || "").trim();
}

function startOfWeek(date) {
  // Week starts Monday
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function startOfYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMonth(0, 1);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function setStatsRangeLabel(range, start, endExclusive) {
  if (!els.statsRangeLabel) return;
  const endInclusive = addDays(endExclusive, -1);
  const startISO = dateObjToISO(start);
  const endISO = dateObjToISO(endInclusive);
  const prefix = range === "week" ? "Week" : range === "month" ? "Month" : "Year";
  els.statsRangeLabel.textContent = `${prefix} range: ${startISO} → ${endISO}`;
}



async function renderStatsChart(range, start, endExclusive) {
  if (!els.statsChart) return;

  // Lazy-load chart library only when needed.
  let Chart;
  try {
    Chart = await ensureChartJs();
  } catch {
    // If the CDN is blocked, show a friendly message instead of a blank area.
    if (statsChartInstance) {
      statsChartInstance.destroy();
      statsChartInstance = null;
    }
    setStatsChartMessage("Chart couldn’t load (network/CDN blocked). Try another network or disable ad-block for this site.");
    return;
  }

  // Aggregate expenses by category
  const categoryTotals = {};
  let totalExpense = 0;

  for (const tx of transactions) {
    const d = new Date(tx.dateISO);
    if (!(d >= start && d < endExclusive)) continue;
    if (tx.type !== "expense") continue;

    const catId = tx.categoryId || "uncategorized";
    categoryTotals[catId] = (categoryTotals[catId] || 0) + tx.amount;
    totalExpense += tx.amount;
  }

  // Prepare data for Chart.js
  const labels = [];
  const dataPoints = [];
  const backgroundColors = [];

  // Helper to get category name
  const getCatName = (id) => {
    if (id === "uncategorized") return "Uncategorized";
    const c = categories.find((cat) => cat.id === id);
    if (!c) return null; // deleted category – skip
    return c.name || "Unnamed";
  };

  // Sort categories by amount desc
  const sortedCatIds = Object.keys(categoryTotals).sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );

  // Filter out deleted categories and zero amounts
  const validCatIds = sortedCatIds.filter((id) => {
    const name = getCatName(id);
    return name !== null && categoryTotals[id] > 0;
  });

  if (validCatIds.length === 0 || totalExpense <= 0) {
    if (statsChartInstance) {
      statsChartInstance.destroy();
      statsChartInstance = null;
    }
    setStatsChartMessage("No expense data in this range.");
    return;
  }

  // Build a palette from existing theme tokens (no new hard-coded theme colors).
  const primary = cssVar("--primary", "#6ea8fe");
  const danger = cssVar("--danger", "#ff6b6b");
  const warning = cssVar("--warning", "#ffd166");

  const withAlpha = (color, alpha) => {
    const a = Math.max(0, Math.min(1, alpha));
    if (!color) return `rgba(0,0,0,${a})`;
    const c = String(color).trim();
    if (c.startsWith("rgba(")) {
      return c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^\)]+\)/, `rgba($1,$2,$3,${a})`);
    }
    if (c.startsWith("rgb(")) {
      return c.replace(/rgb\(([^,]+),([^,]+),([^\)]+)\)/, `rgba($1,$2,$3,${a})`);
    }
    if (c.startsWith("#") && (c.length === 7 || c.length === 4)) {
      const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return c;
  };

  const baseColors = [primary, danger, warning];
  const alphaSteps = [0.85, 0.65, 0.5, 0.35];

  validCatIds.forEach((id, index) => {
    labels.push(getCatName(id));
    dataPoints.push(Math.round(categoryTotals[id] * 100) / 100);
    const base = baseColors[index % baseColors.length];
    const alpha = alphaSteps[Math.floor(index / baseColors.length) % alphaSteps.length];
    backgroundColors.push(withAlpha(base, alpha));
  });

  const text = cssVar("--text", "rgba(255,255,255,0.92)");
  const border = cssVar("--border", "rgba(255,255,255,0.12)");

  const ctx = els.statsChart.getContext("2d");
  if (!ctx) return;

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        backgroundColor: backgroundColors,
        borderColor: border,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: text, padding: 12, usePointStyle: true, pointStyle: "circle" },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.parsed;
            const pct =
              totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
            return `${context.label}: ${money(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (statsChartInstance) {
    statsChartInstance.destroy();
  }

  try {
    statsChartInstance = new Chart(ctx, {
      type: "pie",
      data,
      options,
    });
    setStatsChartMessage("");
  } catch {
    statsChartInstance = null;
    setStatsChartMessage("Chart failed to render. Please refresh and try again.");
  }
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangeFor(anchorISO, range) {
  // Back-compat (unused). Prefer rangeForUi(range).
  const anchor = new Date(anchorISO);
  const start =
    range === "week"
      ? startOfWeek(anchor)
      : range === "month"
        ? startOfMonth(anchor)
        : startOfYear(anchor);
  const endExclusive =
    range === "week"
      ? addDays(start, 7)
      : range === "month"
        ? new Date(start.getFullYear(), start.getMonth() + 1, 1)
        : new Date(start.getFullYear() + 1, 0, 1);
  return { start, endExclusive };
}

function yearsWithRecords() {
  const set = new Set();
  for (const tx of transactions) {
    const y = Number(String(tx.dateISO || "").slice(0, 4));
    if (Number.isFinite(y)) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

function ensureStatsYearOptions() {
  const years = yearsWithRecords();
  const prev = els.statsYear.value;
  els.statsYear.innerHTML = "";

  if (years.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No years yet";
    opt.disabled = true;
    opt.selected = true;
    els.statsYear.appendChild(opt);
    return;
  }

  for (const y of years) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    els.statsYear.appendChild(opt);
  }

  if (prev && years.includes(Number(prev))) {
    els.statsYear.value = prev;
  } else {
    els.statsYear.value = String(years[0]);
  }
}

function renderBudgetScopeLabel() {
  const monthValue = els.budgetMonth.value || currentMonthValue();
  const yearValue = String(budgetMonthRefDate().getFullYear());
  els.budgetScope.textContent = `Budget month: ${monthValue} • Yearly budgets: ${yearValue}`;
}

function setStatsInputVisibility() {
  const range = els.statsRange.value;
  els.statsDateField.hidden = range !== "week";
  els.statsMonthField.hidden = range !== "month";
  els.statsYearField.hidden = range !== "year";
}

function rangeForUi(range) {
  if (range === "week") {
    const anchorISO = els.statsAnchorDate.value || todayISO();
    const anchor = new Date(anchorISO);
    const start = startOfWeek(anchor);
    return { start, endExclusive: addDays(start, 7) };
  }

  if (range === "month") {
    const monthValue = els.statsMonth.value || currentMonthValue();
    const [y, m] = monthValue.split("-").map((x) => Number(x));
    const start = new Date(y, (m || 1) - 1, 1);
    start.setHours(0, 0, 0, 0);
    return { start, endExclusive: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
  }

  const y = Number(els.statsYear.value);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const start = new Date(year, 0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, endExclusive: new Date(year + 1, 0, 1) };
}

// In-memory state
let uid = null;
let unsubCategories = null;
let unsubTransactions = null;

/** @type {Array<{id:string,name:string,budget:number,createdAt:any}>} */
let categories = [];

/** @type {Array<{id:string,categoryId:string,categoryName:string,type:'expense'|'revenue',amount:number,note:string,dateISO:string,createdAt:any}>} */
let transactions = [];

let searchTerm = "";
let activeCategoryId = "";

const TX_PAGE_SIZE = 10;
let txPage = 1;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setWarning(text) {
  els.configWarning.textContent = text;
  els.configWarning.hidden = !text;
  if (els.configCard) els.configCard.hidden = !text;
}

function setAuthError(text) {
  els.authError.textContent = text;
  els.authError.hidden = !text;
}

function setAuthStatus(text) {
  els.authStatus.textContent = text;
}

function setAppError(text) {
  if (!els.appError) return;
  const msg = String(text || "").trim();
  els.appError.textContent = msg;
  els.appError.hidden = !msg;
}

let pendingUndo = null;
let pendingConfirm = null;

function clearUndoToast() {
  if (pendingUndo?.timer) {
    clearTimeout(pendingUndo.timer);
  }
  pendingUndo = null;
  if (els.undoToast) els.undoToast.hidden = true;
  if (els.undoText) els.undoText.textContent = "";
}

function showUndoToast({ message, onUndo }) {
  if (!els.undoToast || !els.undoText || !els.undoBtn) return;

  // Only allow one pending undo at a time.
  clearUndoToast();

  els.undoText.textContent = message;
  els.undoToast.hidden = false;

  const undoHandler = async () => {
    // Prevent double-clicking undo.
    els.undoBtn.disabled = true;
    try {
      await onUndo();
      clearUndoToast();
    } catch (e) {
      setAppError(friendlyDbError(e));
      clearUndoToast();
    } finally {
      els.undoBtn.disabled = false;
    }
  };

  pendingUndo = {
    onUndo: undoHandler,
    timer: setTimeout(() => {
      clearUndoToast();
    }, 5000),
  };

  // Replace handler each time toast is shown.
  els.undoBtn.onclick = undoHandler;
}

function clearConfirmToast() {
  if (pendingConfirm?.resolver) {
    pendingConfirm.resolver(false);
  }
  pendingConfirm = null;
  if (els.confirmToast) els.confirmToast.hidden = true;
  if (els.confirmText) els.confirmText.textContent = "";
}

function showConfirmToast(message) {
  if (!els.confirmToast || !els.confirmText || !els.confirmYesBtn || !els.confirmNoBtn) {
    return Promise.resolve(typeof window === "undefined" ? true : window.confirm(message));
  }

  clearConfirmToast();

  els.confirmText.textContent = message;
  els.confirmToast.hidden = false;
  els.confirmYesBtn.disabled = false;
  els.confirmNoBtn.disabled = false;

  return new Promise((resolve) => {
    pendingConfirm = { resolver: resolve };

    const cleanup = () => {
      if (pendingConfirm?.resolver === resolve) {
        pendingConfirm = null;
      }
      els.confirmToast.hidden = true;
      els.confirmText.textContent = "";
    };

    els.confirmYesBtn.onclick = () => {
      els.confirmYesBtn.disabled = true;
      els.confirmNoBtn.disabled = true;
      cleanup();
      resolve(true);
    };

    els.confirmNoBtn.onclick = () => {
      els.confirmYesBtn.disabled = true;
      els.confirmNoBtn.disabled = true;
      cleanup();
      resolve(false);
    };
  });
}

function stripUndefined(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const cleaned = stripUndefined(v);
    if (cleaned !== undefined) out[k] = cleaned;
  }
  return out;
}

function friendlyDbError(err) {
  const code = err?.code || "";
  if (code === "permission-denied") {
    return "Permission denied by Firestore Rules. Check that you’re signed in and that your Firestore rules allow read/write for this user.";
  }
  if (code === "unauthenticated") {
    return "You’re signed out. Please sign in again.";
  }
  if (code === "unavailable") {
    return "Firestore is temporarily unavailable (network/offline). Check your connection and try again.";
  }
  if (code === "resource-exhausted") {
    return "Quota exceeded (resource exhausted). Try again later or check Firebase usage/quota.";
  }
  if (code === "not-found") {
    return "Item not found (it may have been deleted in another tab).";
  }
  return err?.message || "Operation failed.";
}

async function withDisabled(elements, fn) {
  const list = Array.isArray(elements) ? elements : [elements];
  const toggled = [];
  for (const el of list) {
    if (el && typeof el === "object" && "disabled" in el) {
      toggled.push(el);
      el.disabled = true;
    }
  }
  try {
    await fn();
  } finally {
    for (const el of toggled) el.disabled = false;
  }
}

function computeCategoryTotals(categoryId, budgetPeriod, referenceDate) {
  let spent = 0;
  let income = 0;

  let start = null;
  let endExclusive = null;
  if (budgetPeriod === "month") {
    const ref = referenceDate || new Date();
    start = startOfMonth(ref);
    endExclusive = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  } else if (budgetPeriod === "year") {
    const ref = referenceDate || new Date();
    start = startOfYear(ref);
    endExclusive = new Date(start.getFullYear() + 1, 0, 1);
  }

  for (const tx of transactions) {
    if (tx.categoryId !== categoryId) continue;

    if (start && endExclusive) {
      const d = new Date(tx.dateISO);
      if (!(d >= start && d < endExclusive)) continue;
    }

    if (tx.type === "expense") spent += tx.amount;
    else income += tx.amount;
  }
  return { spent, income, balance: income - spent };
}

function renderCategorySelect() {
  const prev = els.txCategory.value;
  els.txCategory.innerHTML = "";

  if (categories.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Add a category first";
    els.txCategory.appendChild(opt);
    els.txCategory.disabled = true;
    return;
  }

  els.txCategory.disabled = false;
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    els.txCategory.appendChild(opt);
  }

  if (prev && categories.some((c) => c.id === prev)) {
    els.txCategory.value = prev;
  } else if (lastUsedCategoryId && categories.some((c) => c.id === lastUsedCategoryId)) {
    els.txCategory.value = lastUsedCategoryId;
  }
}

function renderCategoriesTable() {
  els.categoryTbody.innerHTML = "";

  if (categories.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="muted">No categories yet.</td>`;
    els.categoryTbody.appendChild(tr);
    return;
  }

  const monthRefDate = budgetMonthRefDate();
  const monthLabel = els.budgetMonth.value || currentMonthValue();

  const selectedYear = monthRefDate.getFullYear();
  const yearRefDate = new Date(selectedYear, 0, 1);
  yearRefDate.setHours(0, 0, 0, 0);
  const yearLabel = String(selectedYear);

  for (const c of categories) {
    const period = c.budgetPeriod || "month";
    const { spent, income, balance } = computeCategoryTotals(
      c.id,
      period,
      period === "month" ? monthRefDate : period === "year" ? yearRefDate : null
    );
    const effectiveBudgetBalance = (c.budget || 0) + balance;

    const periodLabel =
      period === "month"
        ? `Monthly`
        : period === "year"
          ? `Yearly`
          : "Lifetime";

    const budgetUsedPct = (c.budget || 0) > 0 ? Math.min((spent / (c.budget || 1)) * 100, 100) : 0;
    let statusClass = 'budget-ok';
    let statusLabel = '';
    if ((c.budget || 0) > 0 && spent > 0) {
      if (budgetUsedPct >= 100) {
        statusClass = 'budget-over';
        statusLabel = '<span class="budget-badge over">OVER BUDGET</span>';
      } else if (budgetUsedPct >= 80) {
        statusClass = 'budget-warn';
        statusLabel = `<span class="budget-badge warn">${Math.round(budgetUsedPct)}% used</span>`;
      }
    }

    const hasBudget = (c.budget || 0) > 0;
    const progressColor = budgetUsedPct >= 100 ? 'var(--danger)' : budgetUsedPct >= 80 ? 'var(--warning)' : 'var(--primary)';
    const pctDisplay = hasBudget ? Math.round(budgetUsedPct) : 0;
    const net = income - spent;

    const tr = document.createElement("tr");
    tr.dataset.categoryId = c.id;
    tr.classList.add("clickable-row", statusClass, "budget-card-row");
    if (c.id === activeCategoryId) tr.classList.add("selected");

    const progressHtml = hasBudget ? `
          <div class="budget-progress-wrap">
            <div class="budget-progress-bar">
              <div class="budget-progress-fill" style="width:${pctDisplay}%;background:${progressColor}"></div>
            </div>
            <div class="budget-progress-label">${pctDisplay}%</div>
          </div>` : '';

    const statsHtml = hasBudget ? `
          <div class="budget-card-stats">
            <div class="budget-stat"><span class="budget-stat-label">Budget</span><span class="budget-stat-val">${money(c.budget)}</span></div>
            <div class="budget-stat"><span class="budget-stat-label">Spent</span><span class="budget-stat-val val-negative">${money(spent)}</span></div>
            <div class="budget-stat"><span class="budget-stat-label">Income</span><span class="budget-stat-val val-positive">${money(income)}</span></div>
            <div class="budget-stat"><span class="budget-stat-label">Balance</span><span class="budget-stat-val ${effectiveBudgetBalance > 0 ? 'val-positive' : effectiveBudgetBalance < 0 ? 'val-negative' : ''}">${money(effectiveBudgetBalance)}</span></div>
          </div>` : `
          <div class="budget-card-stats budget-card-stats-3">
            <div class="budget-stat"><span class="budget-stat-label">Spent</span><span class="budget-stat-val val-negative">${money(spent)}</span></div>
            <div class="budget-stat"><span class="budget-stat-label">Income</span><span class="budget-stat-val val-positive">${money(income)}</span></div>
            <div class="budget-stat"><span class="budget-stat-label">Net</span><span class="budget-stat-val ${net > 0 ? 'val-positive' : net < 0 ? 'val-negative' : ''}">${money(net)}</span></div>
          </div>`;

    tr.innerHTML = `
      <td colspan="7" class="budget-card-cell">
        <div class="budget-card-inner">
          <div class="budget-card-top">
            <div class="budget-card-name">${escapeHtml(c.name)} ${statusLabel}${!hasBudget ? '<span class="budget-badge no-limit">NO LIMIT</span>' : ''}</div>
            <div class="budget-card-period">${escapeHtml(periodLabel)}</div>
          </div>
          ${progressHtml}
          ${statsHtml}
          <div class="budget-card-actions">
            <button class="btn btn-small" type="button" data-action="edit-category" data-id="${c.id}">Edit</button>
            <button class="btn btn-danger btn-small" type="button" data-action="delete-category" data-id="${c.id}">Delete</button>
          </div>
        </div>
      </td>
    `;
    els.categoryTbody.appendChild(tr);
  }
}

function renderTransactionsTable() {
  /* Preserve min-height to prevent scroll jump when content changes */
  const tableWrap = els.txTbody.closest(".table-wrap");
  if (tableWrap) {
    tableWrap.style.minHeight = tableWrap.offsetHeight + "px";
  }
  els.txTbody.innerHTML = "";

  const term = searchTerm.trim().toLowerCase();
  let filtered = term
    ? transactions.filter((t) =>
        (t.note || "").toLowerCase().includes(term) ||
        (t.categoryName || "").toLowerCase().includes(term)
      )
    : transactions;

  if (activeCategoryId) {
    filtered = filtered.filter((t) => t.categoryId === activeCategoryId);
  }

  // Sort transactions by date (newest first). Work on a copy to avoid mutating the
  // original `transactions` array in-place.
  filtered = filtered.slice().sort((a, b) => {
    const ta = a && a.dateISO ? new Date(a.dateISO).getTime() : 0;
    const tb = b && b.dateISO ? new Date(b.dateISO).getTime() : 0;
    return tb - ta;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / TX_PAGE_SIZE));
  txPage = clamp(txPage, 1, totalPages);

  if (els.txPrevBtn) els.txPrevBtn.disabled = txPage <= 1;
  if (els.txNextBtn) els.txNextBtn.disabled = txPage >= totalPages;
  if (els.txPageInfo) {
    const parts = [];
    if (activeCategoryId) {
      const cat = categories.find((c) => c.id === activeCategoryId);
      parts.push(`Category: ${cat?.name || "(Unknown)"}`);
    }
    if (term) parts.push(`Search: "${term}"`);
    const prefix = parts.length ? `${parts.join(" • ")} — ` : "";

    if (total === 0) {
      els.txPageInfo.textContent = parts.length ? `${prefix}No records.` : "";
    } else {
      const start = (txPage - 1) * TX_PAGE_SIZE + 1;
      const end = Math.min(txPage * TX_PAGE_SIZE, total);
      els.txPageInfo.textContent = `${prefix}Showing ${start}-${end} of ${total} (Page ${txPage}/${totalPages})`;
    }
  }

  if (total === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">No records found.</td>`;
    els.txTbody.appendChild(tr);
    if (tableWrap) requestAnimationFrame(() => { tableWrap.style.minHeight = ""; });
    return;
  }

  const startIndex = (txPage - 1) * TX_PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + TX_PAGE_SIZE);

  for (const tx of pageItems) {
    const tr = document.createElement("tr");
    const typeLabel = tx.type === "expense" ? "Expense" : "Revenue";
    tr.innerHTML = `
      <td data-label="Date">${escapeHtml(tx.dateISO)}</td>
      <td data-label="Category">${escapeHtml(tx.categoryName || "")}</td>
      <td data-label="Type">${escapeHtml(typeLabel)}</td>
      <td class="right" data-label="Amount">${money(tx.amount)}</td>
      <td data-label="Note">${escapeHtml(tx.note || "")}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-small" type="button" data-action="edit-tx" data-id="${tx.id}">Edit</button>
          <button class="btn btn-danger btn-small" type="button" data-action="delete-tx" data-id="${tx.id}">Delete</button>
        </div>
      </td>
    `;
    els.txTbody.appendChild(tr);
  }

  /* Release min-height constraint after content is rendered */
  if (tableWrap) {
    requestAnimationFrame(() => { tableWrap.style.minHeight = ""; });
  }
}

function renderStats() {
  const range = els.statsRange.value;
  const { start, endExclusive } = rangeForUi(range);

  setStatsRangeLabel(range, start, endExclusive);
  // Chart updates async (doesn't block the rest of the UI).
  renderStatsChart(range, start, endExclusive);

  const byCategory = new Map();
  let totalExpense = 0;
  let totalRevenue = 0;

  for (const tx of transactions) {
    const d = new Date(tx.dateISO);
    if (!(d >= start && d < endExclusive)) continue;

    const entry = byCategory.get(tx.categoryId) || {
      categoryName: tx.categoryName || "(Unknown)",
      expense: 0,
      revenue: 0,
    };

    if (tx.type === "expense") {
      entry.expense += tx.amount;
      totalExpense += tx.amount;
    } else {
      entry.revenue += tx.amount;
      totalRevenue += tx.amount;
    }

    byCategory.set(tx.categoryId, entry);
  }

  els.totalExpense.textContent = money(totalExpense);
  els.totalExpense.className = 'stat-value val-negative';
  els.totalRevenue.textContent = money(totalRevenue);
  els.totalRevenue.className = 'stat-value val-positive';
  const net = totalRevenue - totalExpense;
  els.netTotal.textContent = money(net);
  els.netTotal.className = `stat-value ${net > 0 ? 'val-positive' : net < 0 ? 'val-negative' : ''}`;

  renderTrend(range, start, endExclusive);
  renderProjection(range, start, endExclusive);

  els.statsTbody.innerHTML = "";

  const rows = [...byCategory.values()].sort((a, b) => {
    const netA = a.revenue - a.expense;
    const netB = b.revenue - b.expense;
    return Math.abs(netB) - Math.abs(netA);
  });

  if (rows.length === 0) {
    els.statsTbody.innerHTML = `<div class="muted small">No records in this range.</div>`;
    return;
  }

  // Color palette for dots
  const dotColors = ["#7c5cfc", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#ec4899", "#8b5cf6", "#14b8a6"];

  rows.forEach((r, i) => {
    const dotColor = dotColors[i % dotColors.length];
    const netVal = r.revenue - r.expense;
    const chip = document.createElement("div");
    chip.className = "stats-cat-chip";
    chip.innerHTML = `
      <span class="cat-dot" style="background:${dotColor}"></span>
      <span class="cat-chip-name">${escapeHtml(r.categoryName)}</span>
      <span class="cat-chip-amount">${money(r.expense)}</span>
    `;
    els.statsTbody.appendChild(chip);
  });
}

let renderAllPending = false;
function renderAll() {
  if (renderAllPending) return;
  renderAllPending = true;
  queueMicrotask(() => {
    renderAllPending = false;
    renderCategorySelect();
    renderCategoriesTable();
    renderTransactionsTable();
    renderStats();
    updateNoteSuggestions();
    renderQuickRepeat();
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function startListenersForUser(userId) {
  const { categories: categoriesCol, transactions: txCol } = userCollections(userId);

  if (unsubCategories) unsubCategories();
  if (unsubTransactions) unsubTransactions();

  unsubCategories = onSnapshot(query(categoriesCol, orderBy("createdAt", "asc")), (snap) => {
    categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (activeCategoryId && !categories.some((c) => c.id === activeCategoryId)) {
      activeCategoryId = "";
      txPage = 1;
    }

    renderAll();
  });

  unsubTransactions = onSnapshot(query(txCol, orderBy("createdAt", "desc")), (snap) => {
    transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Keep categoryName in sync if category renamed in future.
    const nameById = new Map(categories.map((c) => [c.id, c.name]));
    transactions = transactions.map((t) => ({
      ...t,
      categoryName: nameById.get(t.categoryId) || t.categoryName || "(Unknown)",
    }));

    ensureStatsYearOptions();
    renderBudgetScopeLabel();
    renderAll();
  });
}

function stopListeners() {
  if (unsubCategories) unsubCategories();
  if (unsubTransactions) unsubTransactions();
  unsubCategories = null;
  unsubTransactions = null;
}

function setSignedOutUi() {
  uid = null;
  stopListeners();
  categories = [];
  transactions = [];
  activeCategoryId = "";
  txPage = 1;
  setAppError("");
  clearUndoToast();
  clearConfirmToast();
  ensureStatsYearOptions();
  renderBudgetScopeLabel();
  els.appContent.hidden = true;
  els.authCard.hidden = false;
  els.signOutBtn.disabled = true;
  if (els.assistantFab) els.assistantFab.hidden = true;
  if (els.assistantPanel) els.assistantPanel.hidden = true;
}

async function setSignedInUi(user) {
  uid = user.uid;
  els.authCard.hidden = true;
  els.appContent.hidden = false;
  els.signOutBtn.disabled = false;
  if (els.assistantFab) els.assistantFab.hidden = false;
  setAuthError("");
  setAppError("");
  await startListenersForUser(uid);
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  const msg = String(err?.message || "").toLowerCase();
  if (code === "auth/invalid-credential") return "Wrong email or password.";
  if (code === "auth/user-not-found") return "No account found for this email.";
  if (code === "auth/wrong-password") return "Wrong email or password.";
  if (code === "auth/email-already-in-use") return "Email already in use. Try signing in.";
  if (code === "auth/weak-password") return "Password is too weak (min 6 characters).";
  if (code === "auth/popup-closed-by-user") return "Google sign-in popup was closed.";
  if (code === "auth/popup-blocked") return "Google sign-in popup was blocked by the browser. Try again or use a normal browser (Chrome/Safari).";
  if (code === "auth/operation-not-supported-in-this-environment") {
    return "Google sign-in is not supported in this browser (common in in-app browsers). Open the site in Chrome/Safari and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network request failed. Check your connection, disable VPN/ad blocker, and try again. On mobile, open the site in Chrome/Safari (not an in-app browser) and make sure cookies are allowed.";
  }
  if (msg.includes("requested action is invalid")) {
    return "Google sign-in failed in this mobile browser. Try opening the site in Chrome/Safari (not an in-app browser), and confirm your domain is added to Firebase Auth → Authorized domains.";
  }
  if (code === "auth/unauthorized-domain") {
    const host = typeof window !== "undefined" ? window.location.host : "";
    const suffix = host ? ` Add this domain in Firebase Console → Authentication → Settings → Authorized domains: ${host}` : " Add your site domain in Firebase Console → Authentication → Settings → Authorized domains.";
    return `This domain is not authorized in Firebase Auth.${suffix}`;
  }
  return err?.message || "Sign-in failed.";
}

async function withAuthButtonsDisabled(fn) {
  els.signUpBtn.disabled = true;
  els.signInBtn.disabled = true;
  els.googleBtn.disabled = true;
  try {
    await fn();
  } finally {
    els.signUpBtn.disabled = false;
    els.signInBtn.disabled = false;
    els.googleBtn.disabled = false;
  }
}

async function addCategory() {
  const name = normalizeText(els.categoryName.value);
  const budget = Number(els.categoryBudget.value);
  const budgetPeriod = els.categoryPeriod.value;

  if (!name) return;
  if (!Number.isFinite(budget) || budget < 0) return;
  if (!["month", "year", "lifetime"].includes(budgetPeriod)) return;

  const { categories: categoriesCol } = userCollections(uid);

  await addDoc(categoriesCol, {
    name,
    budget: Math.round(budget * 100) / 100,
    budgetPeriod,
    createdAt: serverTimestamp(),
  });

  els.categoryName.value = "";
  els.categoryBudget.value = "";
  els.categoryName.focus();
}

async function updateCategory() {
  if (!editingCategoryId) return;
  const name = normalizeText(els.categoryName.value);
  const budget = Number(els.categoryBudget.value);
  const budgetPeriod = els.categoryPeriod.value;
  if (!name) return;
  if (!Number.isFinite(budget) || budget < 0) return;
  if (!["month", "year", "lifetime"].includes(budgetPeriod)) return;

  const { categories: categoriesCol } = userCollections(uid);
  await setDoc(doc(categoriesCol, editingCategoryId), {
    name,
    budget: Math.round(budget * 100) / 100,
    budgetPeriod,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Reset edit state
  cancelCategoryEdit();
}

function startCategoryEdit(id) {
  const c = categories.find((x) => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  els.categoryName.value = c.name || "";
  els.categoryBudget.value = c.budget != null ? String(c.budget) : "";
  els.categoryPeriod.value = c.budgetPeriod || "month";
  if (els.categorySubmitBtn) els.categorySubmitBtn.textContent = "Save";
  if (els.cancelCategoryEdit) els.cancelCategoryEdit.hidden = false;
  els.categoryName.focus();
}

function cancelCategoryEdit() {
  editingCategoryId = null;
  els.categoryForm.reset();
  if (els.categorySubmitBtn) els.categorySubmitBtn.textContent = "Add category";
  if (els.cancelCategoryEdit) els.cancelCategoryEdit.hidden = true;
}

async function deleteCategoryById(categoryId) {
  // Only delete the category doc (does not delete old transactions).
  const { categories: categoriesCol } = userCollections(uid);
  await deleteDoc(doc(categoriesCol, categoryId));
}

async function addTransaction() {
  const categoryId = els.txCategory.value;
  const type = els.txType.value;
  const amount = parsePositiveAmount(els.txAmount.value);
  const note = normalizeText(els.txNote.value);
  const dateISO = els.txDate.value;

  if (!categoryId) return;
  if (type !== "expense" && type !== "revenue") return;
  if (amount == null) return;
  if (!dateISO) return;

  const category = categories.find((c) => c.id === categoryId);
  const categoryName = category ? category.name : "(Unknown)";

  const { transactions: txCol } = userCollections(uid);

  await addDoc(txCol, {
    categoryId,
    categoryName,
    type,
    amount,
    note,
    noteLower: note.toLowerCase(),
    dateISO,
    createdAt: serverTimestamp(),
  });

  lastUsedCategoryId = categoryId;
  els.txAmount.value = "";
  els.txNote.value = "";
  if (els.duplicateWarning) els.duplicateWarning.hidden = true;
  els.txAmount.focus();
}

async function updateTransaction() {
  if (!editingTransactionId) return;
  const categoryId = els.txCategory.value;
  const type = els.txType.value;
  const amount = parsePositiveAmount(els.txAmount.value);
  const note = normalizeText(els.txNote.value);
  const dateISO = els.txDate.value;

  if (!categoryId) return;
  if (type !== "expense" && type !== "revenue") return;
  if (amount == null) return;
  if (!dateISO) return;

  const category = categories.find((c) => c.id === categoryId);
  const categoryName = category ? category.name : "(Unknown)";
  const { transactions: txCol } = userCollections(uid);

  await setDoc(doc(txCol, editingTransactionId), {
    categoryId,
    categoryName,
    type,
    amount,
    note,
    noteLower: note.toLowerCase(),
    dateISO,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  cancelTxEdit();
  txPage = 1;
}

function startTxEdit(id) {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  editingTransactionId = id;
  els.txCategory.value = tx.categoryId || "";
  els.txType.value = tx.type || "expense";
  els.txAmount.value = tx.amount != null ? String(tx.amount) : "";
  els.txNote.value = tx.note || "";
  els.txDate.value = tx.dateISO || todayISO();
  if (els.txSubmitBtn) els.txSubmitBtn.textContent = "Save";
  if (els.cancelTxEdit) els.cancelTxEdit.hidden = false;
  els.txAmount.focus();
}

function openEditModal(id) {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;
  editingTransactionId = id;

  // Populate modal category dropdown
  els.editTxCategory.innerHTML = "";
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    els.editTxCategory.appendChild(opt);
  }

  els.editTxCategory.value = tx.categoryId || "";
  els.editTxType.value = tx.type || "expense";
  els.editTxAmount.value = tx.amount != null ? String(tx.amount) : "";
  els.editTxNote.value = tx.note || "";
  els.editTxDate.value = tx.dateISO || todayISO();

  els.editTxModal.hidden = false;
  els.editTxAmount.focus();
}

function closeEditModal() {
  els.editTxModal.hidden = true;
  editingTransactionId = null;
  els.editTxForm.reset();
}

async function saveEditModal() {
  if (!editingTransactionId) return;
  const categoryId = els.editTxCategory.value;
  const type = els.editTxType.value;
  const amount = parsePositiveAmount(els.editTxAmount.value);
  const note = normalizeText(els.editTxNote.value);
  const dateISO = els.editTxDate.value;

  if (!categoryId || !dateISO || amount == null) return;
  if (type !== "expense" && type !== "revenue") return;

  const category = categories.find((c) => c.id === categoryId);
  const categoryName = category ? category.name : "(Unknown)";
  const { transactions: txCol } = userCollections(uid);

  await setDoc(doc(txCol, editingTransactionId), {
    categoryId,
    categoryName,
    type,
    amount,
    note,
    noteLower: note.toLowerCase(),
    dateISO,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  closeEditModal();
}

function cancelTxEdit() {
  editingTransactionId = null;
  els.txForm.reset();
  if (els.txSubmitBtn) els.txSubmitBtn.textContent = "Record";
  if (els.cancelTxEdit) els.cancelTxEdit.hidden = true;
}

async function deleteTransactionById(txId) {
  const { transactions: txCol } = userCollections(uid);
  await deleteDoc(doc(txCol, txId));
}

function updateNoteSuggestions() {
  if (!els.noteSuggestions) return;
  const seen = new Set();
  const opts = [];
  // Most recent transactions first, take unique notes (max 50)
  for (const tx of transactions) {
    const n = (tx.note || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    opts.push(n);
    if (opts.length >= 50) break;
  }
  els.noteSuggestions.innerHTML = "";
  for (const text of opts) {
    const opt = document.createElement("option");
    opt.value = text;
    els.noteSuggestions.appendChild(opt);
  }
}

function renderQuickRepeat() {
  /* Quick repeat removed */
  return;
}

function computeTrend(range, start, endExclusive) {
  // Calculate the previous period of same length
  const durationMs = endExclusive.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - durationMs);
  const prevEnd = start;

  let curExp = 0, curRev = 0, prevExp = 0, prevRev = 0;
  for (const tx of transactions) {
    const d = new Date(tx.dateISO);
    if (d >= start && d < endExclusive) {
      if (tx.type === "expense") curExp += tx.amount;
      else curRev += tx.amount;
    } else if (d >= prevStart && d < prevEnd) {
      if (tx.type === "expense") prevExp += tx.amount;
      else prevRev += tx.amount;
    }
  }
  return { curExp, curRev, prevExp, prevRev };
}

function renderTrend(range, start, endExclusive) {
  if (!els.expenseTrend || !els.revenueTrend) return;
  const { curExp, curRev, prevExp, prevRev } = computeTrend(range, start, endExclusive);

  const formatTrend = (cur, prev) => {
    if (prev === 0 && cur === 0) return { text: "", cls: "" };
    if (prev === 0) return { text: "↑ new", cls: "trend-up" };
    const pct = ((cur - prev) / prev) * 100;
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    return {
      text: `${arrow} ${Math.abs(pct).toFixed(0)}% vs prev`,
      cls: pct > 0 ? "trend-up" : pct < 0 ? "trend-down" : "",
    };
  };

  const expT = formatTrend(curExp, prevExp);
  els.expenseTrend.textContent = expT.text;
  els.expenseTrend.className = `trend-label muted small ${expT.cls}`;

  // For revenue, up is good (flip colors)
  const revT = formatTrend(curRev, prevRev);
  els.revenueTrend.textContent = revT.text;
  els.revenueTrend.className = `trend-label muted small ${revT.cls === "trend-up" ? "trend-down" : revT.cls === "trend-down" ? "trend-up" : ""}`;
}

function renderProjection(range, start, endExclusive) {
  if (!els.projectionRow) return;
  // Only show projection for monthly range and current month
  if (range !== "month") {
    els.projectionRow.hidden = true;
    return;
  }
  const now = new Date();
  const isCurrentMonth = start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
  if (!isCurrentMonth) {
    els.projectionRow.hidden = true;
    return;
  }
  els.projectionRow.hidden = false;

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remaining = daysInMonth - dayOfMonth;

  let totalExp = 0;
  for (const tx of transactions) {
    const d = new Date(tx.dateISO);
    if (d >= start && d < endExclusive && tx.type === "expense") {
      totalExp += tx.amount;
    }
  }

  const dailyAvg = dayOfMonth > 0 ? totalExp / dayOfMonth : 0;
  const projected = totalExp + dailyAvg * remaining;

  if (els.dailyAvgExpense) els.dailyAvgExpense.textContent = money(dailyAvg);
  if (els.projectedExpense) els.projectedExpense.textContent = `~${money(projected)}`;
  if (els.daysLeft) els.daysLeft.textContent = `${remaining} days`;
}

/* =============================================
   BILINGUAL NLP ASSISTANT ENGINE
   Chinese + English + Mixed (Manglish)
   ============================================= */

// --- Chinese number parser ---
function parseChinese(text) {
  const digits = { 零:0,〇:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9 };
  const units = { 十:10,百:100,千:1000,万:10000,亿:100000000 };

  // Simple shorthand like "两百五" = 250, "一百二" = 120
  let s = text.replace(/块|元|令吉|ringgit/gi, "").trim();
  if (!s) return NaN;

  // If it's already a plain number, return it
  const plain = parseFloat(s);
  if (!isNaN(plain) && /^[\d.]+$/.test(s)) return plain;

  // Mixed: "18块" already stripped to "18"
  const mixed = parseFloat(s);
  if (!isNaN(mixed) && /^\d/.test(s)) return mixed;

  let result = 0;
  let current = 0;
  let lastUnit = 1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (digits[ch] !== undefined) {
      current = digits[ch];
    } else if (units[ch] !== undefined) {
      const u = units[ch];
      if (u >= 10000) {
        result = (result + (current || 1)) * u;
        current = 0;
        lastUnit = u;
      } else {
        if (current === 0 && u === 10 && result === 0) current = 1;
        result += (current || 1) * u;
        current = 0;
        lastUnit = u;
      }
    }
  }

  // Trailing digit shorthand: "两百五" → current=5, lastUnit=100 → 5 * 10 = 50
  if (current > 0) {
    if (lastUnit >= 100 && current < 10) {
      result += current * (lastUnit / 10);
    } else {
      result += current;
    }
  }

  return result || NaN;
}

function extractAmount(text) {
  // Try patterns: "18.5", "RM18.5", "$18.5", "18块5", "18.5块"
  const rmMatch = text.match(/(?:rm|RM|MYR|myr)\s*([\d,.]+)/);
  if (rmMatch) return parseFloat(rmMatch[1].replace(/,/g, ""));

  const numMatch = text.match(/([\d]+\.[\d]+|[\d]+)/);
  const chineseAmount = parseChinese(text);

  if (numMatch && !isNaN(chineseAmount)) {
    // Prefer the explicitly parsed number
    return Math.max(parseFloat(numMatch[0]), chineseAmount) || parseFloat(numMatch[0]);
  }
  if (numMatch) return parseFloat(numMatch[0]);
  if (!isNaN(chineseAmount) && chineseAmount > 0) return chineseAmount;
  return null;
}

// --- Category mapping ---
const CATEGORY_MAP = [
  // Food
  { keys: ["food","eat","meal","makan","lunch","dinner","breakfast","吃","饭","餐","鸡饭","chicken rice","nasi","面","mee","粉","饮料","drink","kopi","coffee","tea","茶","奶茶","boba","snack","零食","外卖","takeaway","bento","便当","burger","pizza","sushi","火锅","hotpot","bakery","面包","蛋糕","cake","supper","宵夜"], cat: "food" },
  // Fuel / Transport
  { keys: ["fuel","gas","petrol","diesel","油","打油","加油","transport","grab","taxi","uber","parking","停车","toll","过路费","bus","train","火车","巴士","地铁","mrt","lrt"], cat: "fuel" },
  // Shopping
  { keys: ["shop","shopping","购物","买","buy","bought","淘宝","taobao","shopee","lazada","amazon","mall","商场"], cat: "shopping" },
  // Daily / Groceries
  { keys: ["grocery","groceries","daily","日常","杂货","超市","supermarket","market","菜","蔬菜","水果","fruit"], cat: "daily" },
  // Entertainment
  { keys: ["entertainment","movie","电影","game","游戏","karaoke","ktv","concert","演唱会","bar","pub","club","娱乐"], cat: "entertainment" },
  // Bills / Utilities
  { keys: ["bill","utility","utilities","电费","水费","网费","电话费","phone","internet","wifi","subscription","订阅","netflix","spotify"], cat: "bills" },
  // Rental / Housing
  { keys: ["rent","rental","房租","住房","housing","mortgage","贷款"], cat: "rental" },
  // Health / Medical
  { keys: ["health","medical","doctor","hospital","药","medicine","clinic","诊所","医院","牙","dental"], cat: "health" },
  // Education
  { keys: ["education","school","学费","tuition","book","书","course","课程","学习"], cat: "education" },
  // Salary / Income
  { keys: ["salary","工资","薪水","income","收入","bonus","奖金","freelance","兼职","dividend","利息","interest"], cat: "salary" },
];

function detectCategory(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const group of CATEGORY_MAP) {
    for (const key of group.keys) {
      if (lower.includes(key) && key.length > bestScore) {
        best = group.cat;
        bestScore = key.length;
      }
    }
  }
  return best;
}

// --- Item name extraction ---
const ITEM_MAP = {
  "鸡饭": "chicken rice", "chicken rice": "chicken rice",
  "nasi lemak": "nasi lemak", "nasi goreng": "nasi goreng",
  "炒饭": "fried rice", "fried rice": "fried rice",
  "面": "noodle", "mee": "noodle", "noodle": "noodle",
  "粉": "noodle",
  "kopi": "coffee", "咖啡": "coffee", "coffee": "coffee",
  "奶茶": "milk tea", "boba": "boba tea",
  "茶": "tea", "tea": "tea",
  "burger": "burger", "汉堡": "burger",
  "pizza": "pizza", "披萨": "pizza",
  "sushi": "sushi", "寿司": "sushi",
  "便当": "bento", "bento": "bento",
  "面包": "bread", "bread": "bread",
  "蛋糕": "cake", "cake": "cake",
  "打油": "fuel", "加油": "fuel", "petrol": "fuel", "fuel": "fuel",
  "parking": "parking", "停车": "parking",
  "lotus": "lotus", "莲花": "lotus",
};

function detectItemName(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestLen = 0;
  for (const [key, val] of Object.entries(ITEM_MAP)) {
    if (lower.includes(key) && key.length > bestLen) {
      best = val;
      bestLen = key.length;
    }
  }
  return best;
}

// --- Date extraction ---
function extractDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  if (/今天|today|今日/.test(lower)) return todayISO();
  if (/昨天|yesterday|昨日/.test(lower)) return dateObjToISO(addDays(now, -1));
  if (/前天|day before/.test(lower)) return dateObjToISO(addDays(now, -2));

  // "2月26" or "2/26" or "02-26"
  const dateMatch = lower.match(/(\d{1,2})[月/\-](\d{1,2})/);
  if (dateMatch) {
    const m = parseInt(dateMatch[1]);
    const d = parseInt(dateMatch[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${now.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  return null; // Will default to today
}

// --- Month extraction ---
function extractMonth(text) {
  const lower = text.toLowerCase();

  if (/这个月|this month|本月|当月/.test(lower)) return "current";
  if (/上个月|last month|上月/.test(lower)) return "last";

  const mMatch = lower.match(/(\d{1,2})\s*月/);
  if (mMatch) return parseInt(mMatch[1]);

  const engMatch = lower.match(/(?:month|月)\s*(\d{1,2})/);
  if (engMatch) return parseInt(engMatch[1]);

  return null;
}

// --- Intent detection ---
function detectIntent(text) {
  const lower = text.toLowerCase();

  // Query intents (check first, since they overlap with keywords)
  const isQuery = /多少|how much|spent|花了|用了|花费|总共|total|查|查询|几|what|多少钱|summary|report/.test(lower);

  if (isQuery) {
    const month = extractMonth(lower);
    const category = detectCategory(lower);
    const itemName = detectItemName(lower);

    if (itemName && !category) {
      return { intent: "query_item", item_name: itemName, month: month || "current" };
    }
    if (category) {
      return { intent: "query_category", category, month: month || "current" };
    }
    return { intent: "query_total", month: month || "current" };
  }

  // Income intents
  const isIncome = /收入|income|salary|薪水|工资|bonus|奖金|earned|赚|入账|revenue/.test(lower);
  if (isIncome) return { intent: "add_income" };

  // Default: add expense
  return { intent: "add_expense" };
}

// --- Parse multiple transactions from one sentence ---
function parseMultipleTransactions(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const base = detectIntent(raw);
  
  // Query intents don't batch
  if (base.intent && base.intent.startsWith("query_")) {
    return [parseNaturalInput(raw)];
  }

  // For add_expense/add_income, split on common delimiters and try to extract multiple items
  const delimiters = /\s*(?:,|，|and|且|还有|以及|、|;|；)\s*/;
  const segments = raw.split(delimiters).filter(s => s.trim());

  if (segments.length === 1) {
    // Single transaction
    return [parseNaturalInput(raw)];
  }

  // Try to parse multiple transactions
  const results = [];
  for (const segment of segments) {
    const parsed = parseNaturalInput(segment);
    // Only add if we got an amount (query intents or amounts without value are skipped)
    if (parsed && parsed.amount && parsed.amount > 0) {
      results.push(parsed);
    }
  }

  // If we successfully parsed multiple items with amounts, return them
  if (results.length > 1) {
    return results;
  }

  // Otherwise fall back to single parse of whole text
  return [parseNaturalInput(raw)];
}

// --- Main NLP parser (single transaction) ---
function parseNaturalInput(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const base = detectIntent(raw);
  const amount = extractAmount(raw);
  const category = base.category || detectCategory(raw);
  const itemName = base.item_name || detectItemName(raw);
  const date = extractDate(raw);
  const month = base.month || extractMonth(raw);

  const result = { ...base };

  if (amount != null && amount > 0) result.amount = Math.round(amount * 100) / 100;
  if (category) result.category = category;
  if (itemName) result.item_name = itemName;
  if (date) result.date = date;
  if (month) result.month = month;
  result.currency = "MYR";

  return result;
}

// --- Execute parsed intent ---
function resolveMonth(monthVal) {
  const now = new Date();
  if (monthVal === "current") {
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      label: currentMonthValue(),
    };
  }
  if (monthVal === "last") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      month: prev.getMonth() + 1,
      year: prev.getFullYear(),
      label: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
    };
  }
  if (typeof monthVal === "number" && monthVal >= 1 && monthVal <= 12) {
    return {
      month: monthVal,
      year: now.getFullYear(),
      label: `${now.getFullYear()}-${String(monthVal).padStart(2, "0")}`,
    };
  }
  return { month: now.getMonth() + 1, year: now.getFullYear(), label: currentMonthValue() };
}

function queryTransactions(parsed) {
  const r = resolveMonth(parsed.month);
  const start = new Date(r.year, r.month - 1, 1);
  const end = new Date(r.year, r.month, 1);

  let filtered = transactions.filter((tx) => {
    const d = new Date(tx.dateISO);
    return d >= start && d < end;
  });

  if (parsed.intent === "query_category" && parsed.category) {
    const catLower = parsed.category.toLowerCase();
    // Find matching categories by name or our mapped name
    const matchingCatIds = new Set();
    for (const c of categories) {
      const cName = c.name.toLowerCase();
      if (cName.includes(catLower) || catLower.includes(cName)) {
        matchingCatIds.add(c.id);
      }
    }
    // Also match via CATEGORY_MAP
    const mapGroup = CATEGORY_MAP.find((g) => g.cat === catLower);
    if (mapGroup) {
      for (const c of categories) {
        const cName = c.name.toLowerCase();
        if (mapGroup.keys.some((k) => cName.includes(k) || k.includes(cName))) {
          matchingCatIds.add(c.id);
        }
      }
    }
    if (matchingCatIds.size > 0) {
      filtered = filtered.filter((tx) => matchingCatIds.has(tx.categoryId));
    } else {
      // Try note matching as fallback
      filtered = filtered.filter((tx) =>
        (tx.note || "").toLowerCase().includes(catLower) ||
        (tx.categoryName || "").toLowerCase().includes(catLower)
      );
    }
  }

  if (parsed.intent === "query_item" && parsed.item_name) {
    const itemLower = parsed.item_name.toLowerCase();
    // Also check original Chinese text
    const originalKeys = Object.entries(ITEM_MAP)
      .filter(([, v]) => v === parsed.item_name)
      .map(([k]) => k.toLowerCase());

    filtered = filtered.filter((tx) => {
      const note = (tx.note || "").toLowerCase();
      const cat = (tx.categoryName || "").toLowerCase();
      return note.includes(itemLower) || cat.includes(itemLower) ||
        originalKeys.some((k) => note.includes(k));
    });
  }

  let totalExpense = 0;
  let totalRevenue = 0;
  for (const tx of filtered) {
    if (tx.type === "expense") totalExpense += tx.amount;
    else totalRevenue += tx.amount;
  }

  return {
    count: filtered.length,
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    net: Math.round((totalRevenue - totalExpense) * 100) / 100,
    monthLabel: r.label,
  };
}

function findCategoryByNlp(catName) {
  if (!catName) return null;
  const lower = catName.toLowerCase();

  // Direct name match
  for (const c of categories) {
    if (c.name.toLowerCase() === lower) return c;
  }

  // Partial match
  for (const c of categories) {
    const cName = c.name.toLowerCase();
    if (cName.includes(lower) || lower.includes(cName)) return c;
  }

  // Map-based match
  const mapGroup = CATEGORY_MAP.find((g) => g.cat === lower);
  if (mapGroup) {
    for (const c of categories) {
      const cName = c.name.toLowerCase();
      if (mapGroup.keys.some((k) => cName.includes(k) || k.includes(cName))) return c;
    }
  }

  return null;
}

async function executeAssistantIntent(parsed) {
  if (!uid) return { ok: false, message: "Please sign in first." };
  if (!parsed) return { ok: false, message: "I didn't understand that. Try again?" };

  const intent = parsed.intent;

  // --- Queries ---
  if (intent === "query_total" || intent === "query_category" || intent === "query_item" || intent === "query_month" || intent === "query_custom") {
    const result = queryTransactions(parsed);
    let label = "";
    if (intent === "query_category") {
      label = `${parsed.category || "all"} spending`;
    } else if (intent === "query_item") {
      label = `"${parsed.item_name}" spending`;
    } else {
      label = "total";
    }
    return {
      ok: true,
      type: "query",
      message: `📊 ${label} for ${result.monthLabel}`,
      expense: result.totalExpense,
      revenue: result.totalRevenue,
      net: result.net,
      count: result.count,
    };
  }

  // --- Add expense / income ---
  if (intent === "add_expense" || intent === "add_income") {
    if (!parsed.amount || parsed.amount <= 0) {
      return { ok: false, message: "I couldn't detect the amount. Please include a number." };
    }

    const type = intent === "add_income" ? "revenue" : "expense";
    const cat = findCategoryByNlp(parsed.category);
    if (!cat && categories.length === 0) {
      return { ok: false, message: "No categories yet. Please add a category first." };
    }

    const categoryId = cat ? cat.id : categories[0].id;
    const categoryName = cat ? cat.name : categories[0].name;
    const dateISO = parsed.date || todayISO();
    const note = parsed.item_name || parsed.category || "";

    const { transactions: txCol } = userCollections(uid);
    await addDoc(txCol, {
      categoryId,
      categoryName,
      type,
      amount: parsed.amount,
      note,
      noteLower: note.toLowerCase(),
      dateISO,
      createdAt: serverTimestamp(),
    });

    lastUsedCategoryId = categoryId;

    const typeLabel = type === "expense" ? "Expense" : "Income";
    return {
      ok: true,
      type: "add",
      message: `✅ ${typeLabel} recorded!`,
      detail: `${categoryName} · ${money(parsed.amount)} · ${dateISO}${note ? " · " + note : ""}`,
    };
  }

  return { ok: false, message: "I'm not sure what to do. Try saying something like '今天吃鸡饭18块' or 'spent 50 on fuel'." };
}

// --- Chat UI helpers ---
function addChatBubble(type, html) {
  if (!els.assistantChat) return;
  const div = document.createElement("div");
  div.className = `chat-bubble ${type === "user" ? "chat-user" : "chat-bot"}`;
  div.innerHTML = html;
  els.assistantChat.appendChild(div);
  els.assistantChat.scrollTop = els.assistantChat.scrollHeight;
}

function addThinking() {
  if (!els.assistantChat) return null;
  const div = document.createElement("div");
  div.className = "chat-thinking";
  div.textContent = "Thinking...";
  els.assistantChat.appendChild(div);
  els.assistantChat.scrollTop = els.assistantChat.scrollHeight;
  return div;
}

function formatQueryResult(result) {
  let html = `<span>${escapeHtml(result.message)}</span>`;
  html += `<span class="chat-amount">${money(result.expense)} expense</span>`;
  if (result.revenue > 0) {
    html += `<span class="chat-detail">Revenue: ${money(result.revenue)} · Net: ${money(result.net)}</span>`;
  }
  html += `<span class="chat-detail">${result.count} record(s) found</span>`;
  return html;
}

function formatAddResult(result) {
  let html = `<span class="chat-success">${escapeHtml(result.message)}</span>`;
  html += `<span class="chat-detail">${escapeHtml(result.detail)}</span>`;
  return html;
}

function formatBatchAddResult(results, errors) {
  let html = `<span class="chat-success">✅ ${results.length} transaction(s) recorded!</span>`;
  
  // Show each transaction
  for (const r of results) {
    html += `<span class="chat-detail">• ${escapeHtml(r.detail)}</span>`;
  }
  
  // Show any errors
  if (errors && errors.length > 0) {
    html += `<span class="chat-detail" style="color:#f59e0b;">⚠️ ${errors.length} failed: ${escapeHtml(errors[0])}</span>`;
  }
  
  return html;
}

async function handleAssistantMessage(text) {
  const raw = text.trim();
  if (!raw) return;

  addChatBubble("user", escapeHtml(raw));
  const thinking = addThinking();

  try {
    const parsedList = parseMultipleTransactions(raw);
    
    // Handle single transaction case (queries)
    if (parsedList.length === 1 && parsedList[0].intent.startsWith("query_")) {
      const result = await executeAssistantIntent(parsedList[0]);
      if (thinking) thinking.remove();

      if (!result.ok) {
        addChatBubble("bot", `<span>${escapeHtml(result.message)}</span>`);
        return;
      }
      if (result.type === "query") {
        addChatBubble("bot", formatQueryResult(result));
      }
      return;
    }

    // Handle batch add (add_expense / add_income)
    if (parsedList.length > 0 && (parsedList[0].intent === "add_expense" || parsedList[0].intent === "add_income")) {
      const results = [];
      const errors = [];

      for (const parsed of parsedList) {
        try {
          const result = await executeAssistantIntent(parsed);
          if (result.ok) {
            results.push(result);
          } else {
            errors.push(result.message);
          }
        } catch (err) {
          errors.push(friendlyDbError(err));
        }
      }

      if (thinking) thinking.remove();

      if (results.length === 0 && errors.length > 0) {
        addChatBubble("bot", `<span>❌ ${escapeHtml(errors[0])}</span>`);
        return;
      }

      if (results.length > 1) {
        // Batch result
        addChatBubble("bot", formatBatchAddResult(results, errors));
      } else if (results.length === 1) {
        // Single result
        addChatBubble("bot", formatAddResult(results[0]));
      }
      return;
    }

    // Fallback to single parse
    const result = await executeAssistantIntent(parsedList[0]);
    if (thinking) thinking.remove();

    if (!result.ok) {
      addChatBubble("bot", `<span>${escapeHtml(result.message)}</span>`);
      return;
    }

    if (result.type === "query") {
      addChatBubble("bot", formatQueryResult(result));
    } else if (result.type === "add") {
      addChatBubble("bot", formatAddResult(result));
    }
  } catch (err) {
    if (thinking) thinking.remove();
    addChatBubble("bot", `<span>❌ Error: ${escapeHtml(friendlyDbError(err))}</span>`);
  }
}

// --- Web Speech API ---
let speechRecognition = null;
let isListening = false;

function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  // Support Chinese + English mixed input
  rec.lang = "zh-CN";

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (els.assistantInput) els.assistantInput.value = transcript;
    handleAssistantMessage(transcript);
    stopListening();
  };

  rec.onerror = (event) => {
    stopListening();
    if (event.error === "no-speech") {
      addChatBubble("bot", "<span>🎤 No speech detected. Please try again.</span>");
    } else if (event.error === "not-allowed") {
      addChatBubble("bot", "<span>🎤 Microphone access denied. Please allow mic permission.</span>");
    }
  };

  rec.onend = () => {
    stopListening();
  };

  return rec;
}

function startListening() {
  if (!speechRecognition) {
    speechRecognition = initSpeechRecognition();
  }
  if (!speechRecognition) {
    addChatBubble("bot", "<span>🎤 Speech recognition not supported in this browser. Use Chrome for best results.</span>");
    return;
  }
  try {
    speechRecognition.start();
    isListening = true;
    if (els.assistantMicBtn) els.assistantMicBtn.classList.add("listening");
  } catch {
    // Already started
  }
}

function stopListening() {
  isListening = false;
  if (els.assistantMicBtn) els.assistantMicBtn.classList.remove("listening");
  try {
    if (speechRecognition) speechRecognition.stop();
  } catch {
    // ignore
  }
}

function toggleAssistantPanel(show) {
  if (!els.assistantPanel || !els.assistantFab) return;
  const visible = show !== undefined ? show : els.assistantPanel.hidden;
  els.assistantPanel.hidden = !visible;
  els.assistantFab.hidden = visible;
  if (visible && els.assistantInput) {
    els.assistantInput.focus();
  }
  if (!visible) {
    stopListening();
  }
}

function wireAssistantEvents() {
  if (els.assistantFab) {
    els.assistantFab.addEventListener("click", () => toggleAssistantPanel(true));
  }
  if (els.closeAssistant) {
    els.closeAssistant.addEventListener("click", () => toggleAssistantPanel(false));
  }
  if (els.assistantSendBtn) {
    els.assistantSendBtn.addEventListener("click", () => {
      const val = els.assistantInput?.value || "";
      if (val.trim()) {
        handleAssistantMessage(val);
        els.assistantInput.value = "";
      }
    });
  }
  if (els.assistantInput) {
    els.assistantInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = els.assistantInput.value || "";
        if (val.trim()) {
          handleAssistantMessage(val);
          els.assistantInput.value = "";
        }
      }
    });
  }
  if (els.assistantMicBtn) {
    els.assistantMicBtn.addEventListener("click", () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  }
  // Escape closes the panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.assistantPanel && !els.assistantPanel.hidden) {
        toggleAssistantPanel(false);
      }
      if (els.editTxModal && !els.editTxModal.hidden) {
        closeEditModal();
      }
      if (els.receiptModal && !els.receiptModal.hidden) {
        closeReceiptModal();
      }
    }
  });
}

function checkDuplicate() {
  if (!els.duplicateWarning) return;
  const categoryId = els.txCategory.value;
  const amount = parsePositiveAmount(els.txAmount.value);
  const dateISO = els.txDate.value;
  if (!categoryId || !amount || !dateISO) {
    els.duplicateWarning.hidden = true;
    return;
  }
  const isDup = transactions.some(
    (t) => t.categoryId === categoryId && t.amount === amount && t.dateISO === dateISO && t.id !== editingTransactionId
  );
  els.duplicateWarning.hidden = !isDup;
}

/* ─── Smart Auto-Categorization ─── */
function suggestCategoryFromNote(noteText) {
  const text = (noteText || "").trim().toLowerCase();
  if (!text || text.length < 2) return null;

  // Build frequency map: for each category, count how many past transactions have similar notes
  const scores = new Map();
  for (const tx of transactions) {
    const txNote = (tx.note || "").toLowerCase();
    if (!txNote) continue;
    // Check if the note text overlaps with the current input
    if (txNote.includes(text) || text.includes(txNote)) {
      const catId = tx.categoryId;
      scores.set(catId, (scores.get(catId) || 0) + 2); // exact-ish match
    } else {
      // Word-level overlap
      const inputWords = text.split(/\s+/);
      const noteWords = txNote.split(/\s+/);
      const overlap = inputWords.filter((w) => w.length >= 2 && noteWords.some((nw) => nw.includes(w) || w.includes(nw)));
      if (overlap.length > 0) {
        const catId = tx.categoryId;
        scores.set(catId, (scores.get(catId) || 0) + overlap.length);
      }
    }
  }

  if (scores.size === 0) return null;

  // Pick the category with the highest score
  let bestId = null;
  let bestScore = 0;
  for (const [catId, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestId = catId;
    }
  }
  if (!bestId) return null;
  const cat = categories.find((c) => c.id === bestId);
  return cat ? { id: cat.id, name: cat.name, score: bestScore } : null;
}

function updateAutoCategorySuggestion() {
  if (!els.autoCategorySuggestion) return;
  const noteText = els.txNote.value;
  const currentCat = els.txCategory.value;
  const suggestion = suggestCategoryFromNote(noteText);

  if (!suggestion || suggestion.id === currentCat) {
    els.autoCategorySuggestion.hidden = true;
    return;
  }

  els.autoCategorySuggestion.textContent = `💡 Suggest: ${suggestion.name} (click to apply)`;
  els.autoCategorySuggestion.hidden = false;
  els.autoCategorySuggestion.onclick = () => {
    els.txCategory.value = suggestion.id;
    els.autoCategorySuggestion.hidden = true;
  };
}

/* ─── Spending Insights ─── */
function generateInsights() {
  if (!els.insightsContent) return;
  if (transactions.length === 0) {
    els.insightsContent.innerHTML = '<div class="muted">Add some records to see insights.</div>';
    return;
  }

  const now = new Date();
  const thisMonth = currentMonthValue(now);
  const lastMonth = currentMonthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Current month transactions
  const curMonthTxs = transactions.filter((t) => t.dateISO && t.dateISO.substring(0, 7) === thisMonth);
  const prevMonthTxs = transactions.filter((t) => t.dateISO && t.dateISO.substring(0, 7) === lastMonth);

  let curExpense = 0, curRevenue = 0, prevExpense = 0, prevRevenue = 0;
  const catSpend = new Map();

  for (const tx of curMonthTxs) {
    if (tx.type === "expense") {
      curExpense += tx.amount;
      catSpend.set(tx.categoryName || "(Unknown)", (catSpend.get(tx.categoryName || "(Unknown)") || 0) + tx.amount);
    } else {
      curRevenue += tx.amount;
    }
  }
  for (const tx of prevMonthTxs) {
    if (tx.type === "expense") prevExpense += tx.amount;
    else prevRevenue += tx.amount;
  }

  const cards = [];

  // 1. Monthly Overview
  const netCur = curRevenue - curExpense;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? curExpense / dayOfMonth : 0;
  const projected = dailyAvg * daysInMonth;

  cards.push(`<div class="insight-card">
    <h4>📊 This Month Overview</h4>
    <ul>
      <li>Total Expense: <span class="insight-warn">${money(curExpense)}</span></li>
      <li>Total Revenue: <span class="insight-good">${money(curRevenue)}</span></li>
      <li>Net: <span class="${netCur >= 0 ? 'insight-good' : 'insight-warn'}">${money(netCur)}</span></li>
      <li>Daily Average Spending: <span class="insight-highlight">${money(dailyAvg)}</span></li>
      <li>Projected Month-End Expense: <span class="insight-highlight">${money(projected)}</span></li>
    </ul>
  </div>`);

  // 2. Month-over-month comparison
  if (prevExpense > 0 || prevRevenue > 0) {
    const expChange = prevExpense > 0 ? ((curExpense - prevExpense) / prevExpense * 100) : 0;
    const revChange = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const expArrow = expChange > 0 ? "↑" : expChange < 0 ? "↓" : "→";
    const revArrow = revChange > 0 ? "↑" : revChange < 0 ? "↓" : "→";

    cards.push(`<div class="insight-card">
      <h4>📈 vs Last Month</h4>
      <ul>
        <li>Expenses: ${expArrow} <span class="${expChange > 0 ? 'insight-warn' : 'insight-good'}">${Math.abs(expChange).toFixed(1)}% ${expChange > 0 ? 'more' : 'less'}</span> (was ${money(prevExpense)})</li>
        <li>Revenue: ${revArrow} <span class="${revChange >= 0 ? 'insight-good' : 'insight-warn'}">${Math.abs(revChange).toFixed(1)}% ${revChange >= 0 ? 'more' : 'less'}</span> (was ${money(prevRevenue)})</li>
      </ul>
    </div>`);
  }

  // 3. Top spending categories
  if (catSpend.size > 0) {
    const sorted = [...catSpend.entries()].sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const topItems = top5.map(([name, amount], i) => {
      const pct = curExpense > 0 ? (amount / curExpense * 100).toFixed(1) : 0;
      return `<li>${i + 1}. ${escapeHtml(name)}: <span class="insight-highlight">${money(amount)}</span> (${pct}%)</li>`;
    }).join("");

    cards.push(`<div class="insight-card">
      <h4>🏆 Top Spending Categories</h4>
      <ul>${topItems}</ul>
    </div>`);
  }

  // 4. Budget alerts
  const budgetAlerts = [];
  for (const cat of categories) {
    if (!cat.budget || cat.budget <= 0) continue;
    const period = cat.budgetPeriod || "month";
    if (period !== "month") continue;
    const spent = curMonthTxs.filter((t) => t.categoryId === cat.id && t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const pct = (spent / cat.budget) * 100;
    if (pct >= 80) {
      budgetAlerts.push({ name: cat.name, spent, budget: cat.budget, pct });
    }
  }
  if (budgetAlerts.length > 0) {
    const alertItems = budgetAlerts.map((a) => {
      const cls = a.pct >= 100 ? 'insight-warn' : 'insight-highlight';
      const label = a.pct >= 100 ? '⚠️ OVER BUDGET' : `⚡ ${a.pct.toFixed(0)}% used`;
      return `<li>${escapeHtml(a.name)}: ${money(a.spent)} / ${money(a.budget)} — <span class="${cls}">${label}</span></li>`;
    }).join("");

    cards.push(`<div class="insight-card">
      <h4>🚨 Budget Alerts</h4>
      <ul>${alertItems}</ul>
    </div>`);
  }

  // 5. Spending pattern (weekday vs weekend)
  const weekdaySpend = { total: 0, count: 0 };
  const weekendSpend = { total: 0, count: 0 };
  for (const tx of curMonthTxs) {
    if (tx.type !== "expense") continue;
    const d = new Date(tx.dateISO);
    const day = d.getDay();
    if (day === 0 || day === 6) {
      weekendSpend.total += tx.amount;
      weekendSpend.count++;
    } else {
      weekdaySpend.total += tx.amount;
      weekdaySpend.count++;
    }
  }
  if (weekdaySpend.count > 0 || weekendSpend.count > 0) {
    const wdAvg = weekdaySpend.count > 0 ? weekdaySpend.total / weekdaySpend.count : 0;
    const weAvg = weekendSpend.count > 0 ? weekendSpend.total / weekendSpend.count : 0;
    const higher = weAvg > wdAvg ? "weekends" : "weekdays";

    cards.push(`<div class="insight-card">
      <h4>📅 Spending Pattern</h4>
      <ul>
        <li>Avg per weekday transaction: <span class="insight-highlight">${money(wdAvg)}</span> (${weekdaySpend.count} txns)</li>
        <li>Avg per weekend transaction: <span class="insight-highlight">${money(weAvg)}</span> (${weekendSpend.count} txns)</li>
        <li>You tend to spend more on <strong>${higher}</strong></li>
      </ul>
    </div>`);
  }

  els.insightsContent.innerHTML = cards.join("");
}

/* ─── Receipt OCR Scan ─── */
let receiptStream = null;
let TesseractWorker = null;
let receiptExtractedAmount = null;
let receiptExtractedText = "";

async function ensureTesseract() {
  if (TesseractWorker) return TesseractWorker;
  if (els.receiptStatus) els.receiptStatus.textContent = "Loading OCR engine…";

  // Load Tesseract.js via script tag if not already loaded
  if (!globalThis.Tesseract) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load Tesseract.js"));
      document.head.appendChild(script);
    });
  }

  const worker = await globalThis.Tesseract.createWorker("eng");
  TesseractWorker = worker;
  if (els.receiptStatus) els.receiptStatus.textContent = "";
  return worker;
}

function stopReceiptCamera() {
  if (receiptStream) {
    for (const track of receiptStream.getTracks()) track.stop();
    receiptStream = null;
  }
  if (els.receiptVideo) els.receiptVideo.hidden = true;
  if (els.receiptCaptureBtn) els.receiptCaptureBtn.hidden = true;
}

function openReceiptModal() {
  if (els.receiptModal) els.receiptModal.hidden = false;
  if (els.receiptResult) els.receiptResult.hidden = true;
  if (els.receiptPreview) els.receiptPreview.hidden = true;
  if (els.receiptStatus) els.receiptStatus.textContent = "";
  receiptExtractedAmount = null;
  receiptExtractedText = "";
}

function closeReceiptModal() {
  stopReceiptCamera();
  if (els.receiptModal) els.receiptModal.hidden = true;
  if (els.receiptResult) els.receiptResult.hidden = true;
  if (els.receiptPreview) els.receiptPreview.hidden = true;
}

async function startReceiptCamera() {
  try {
    stopReceiptCamera();
    receiptStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    els.receiptVideo.srcObject = receiptStream;
    els.receiptVideo.hidden = false;
    els.receiptCaptureBtn.hidden = false;
    if (els.receiptStatus) els.receiptStatus.textContent = "Point camera at receipt and tap Capture.";
  } catch (err) {
    if (els.receiptStatus) els.receiptStatus.textContent = "Camera not available. Try uploading an image instead.";
  }
}

function captureFromVideo() {
  const video = els.receiptVideo;
  const canvas = els.receiptCanvas;
  if (!video || !canvas) return null;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);
  stopReceiptCamera();
  return canvas;
}

async function processReceiptImage(imageSource) {
  if (els.receiptStatus) els.receiptStatus.textContent = "Analyzing receipt…";
  if (els.receiptResult) els.receiptResult.hidden = true;

  try {
    const worker = await ensureTesseract();
    const { data } = await worker.recognize(imageSource);
    const fullText = data.text || "";

    // Extract amounts — look for currency patterns
    const amountRegex = /(?:RM|MYR|USD|\$|€|£|¥)?\s*(\d{1,}[.,]\d{2})\b/gi;
    const amounts = [];
    let match;
    while ((match = amountRegex.exec(fullText)) !== null) {
      const val = parseFloat(match[1].replace(",", "."));
      if (val > 0 && val < 1000000) amounts.push(val);
    }

    // Also try plain number patterns like "12.50" on their own lines
    if (amounts.length === 0) {
      const lineAmounts = fullText.split("\n").map((l) => l.trim()).filter((l) => /^\d+[.,]\d{2}$/.test(l));
      for (const la of lineAmounts) {
        const val = parseFloat(la.replace(",", "."));
        if (val > 0) amounts.push(val);
      }
    }

    // Pick the largest amount as "total"
    const bestAmount = amounts.length > 0 ? Math.max(...amounts) : null;
    receiptExtractedAmount = bestAmount;

    // Clean the text for note — take first meaningful non-number line
    const lines = fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
    const noteLines = lines.filter((l) => !/^\d+[.,]\d{2}$/.test(l)).slice(0, 3);
    receiptExtractedText = noteLines.join(" ").substring(0, 80);

    if (els.receiptAmountResult) els.receiptAmountResult.textContent = bestAmount != null ? money(bestAmount) : "Not detected";
    if (els.receiptTextResult) els.receiptTextResult.textContent = receiptExtractedText || "Not detected";
    if (els.receiptResult) els.receiptResult.hidden = false;
    if (els.receiptStatus) els.receiptStatus.textContent = "Done! Review the extracted data below.";
  } catch (err) {
    if (els.receiptStatus) els.receiptStatus.textContent = "OCR failed: " + (err.message || "Unknown error");
  }
}

function applyReceiptToForm() {
  if (receiptExtractedAmount != null) {
    els.txAmount.value = String(receiptExtractedAmount);
  }
  if (receiptExtractedText) {
    els.txNote.value = receiptExtractedText;
    updateAutoCategorySuggestion();
  }
  closeReceiptModal();
}

/** Scroll to top of the page for pagination UX */
function scrollToRecordList() {
  if (window.scrollY < 10) return; /* Already at top, skip */
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 50);
}

function wireEvents() {
  /* -- Sidebar navigation -- */
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const closeSidebarBtn = document.getElementById("closeSidebar");
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  const viewSections = document.querySelectorAll(".view-section");

  function openSidebar() {
    if (window.innerWidth >= 980) {
      /* Desktop: toggle collapsed state */
      document.body.classList.toggle("sidebar-collapsed");
      return;
    }
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("open");
    sidebarOverlay.hidden = false;
  }

  function closeSidebar() {
    if (window.innerWidth >= 980) {
      /* Desktop: collapse sidebar */
      document.body.classList.add("sidebar-collapsed");
      return;
    }
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("open");
    setTimeout(() => { sidebarOverlay.hidden = true; }, 300);
  }

  function switchView(viewName) {
    viewSections.forEach((s) => {
      s.classList.toggle("active", s.dataset.view === viewName);
    });
    sidebarItems.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    /* Close sidebar after navigation on all screen sizes */
    if (window.innerWidth < 980) {
      closeSidebar();
    } else {
      document.body.classList.add("sidebar-collapsed");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Auto-generate insights when navigating to that view
    if (viewName === "insights") {
      generateInsights();
    }
  }

  if (menuBtn) menuBtn.addEventListener("click", openSidebar);
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeSidebar();
    });
  }
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => switchView(item.dataset.view));
  });

  /* Activate the default view */
  switchView("record");

  /* -- Collapsible sections on mobile -- */
  document.querySelectorAll(".collapsible-toggle").forEach((toggle) => {
    const section = toggle.closest(".collapsible-section");
    if (!section) return;
    const body = section.querySelector(".collapsible-body");
    const chevron = toggle.querySelector(".collapse-chevron");

    const setCollapsed = (collapsed) => {
      if (collapsed) {
        section.classList.add("collapsed");
        toggle.setAttribute("aria-expanded", "false");
        if (chevron) chevron.textContent = "▸";
      } else {
        /* Preserve scroll position so page doesn't jump */
        const prevTop = toggle.getBoundingClientRect().top;
        section.classList.remove("collapsed");
        toggle.setAttribute("aria-expanded", "true");
        if (chevron) chevron.textContent = "▾";
        /* Restore toggle to same visual position */
        const newTop = toggle.getBoundingClientRect().top;
        if (Math.abs(newTop - prevTop) > 2) {
          window.scrollBy(0, newTop - prevTop);
        }
      }
    };

    const doToggle = () => {
      setCollapsed(!section.classList.contains("collapsed"));
    };

    /* Scroll-aware toggle: ignore taps that were really scrolls */
    let _toggleTouchMoved = false;
    let _toggleTouchStartY = 0;
    toggle.addEventListener("touchstart", (e) => {
      _toggleTouchMoved = false;
      _toggleTouchStartY = e.touches[0].clientY;
    }, { passive: true });
    toggle.addEventListener("touchmove", (e) => {
      /* If finger moved more than 10px, it's a scroll, not a tap */
      if (Math.abs(e.touches[0].clientY - _toggleTouchStartY) > 10) {
        _toggleTouchMoved = true;
      }
    }, { passive: true });

    toggle.addEventListener("click", (e) => {
      if (_toggleTouchMoved) { _toggleTouchMoved = false; return; }
      doToggle();
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doToggle(); }
    });

    /* Re-measure when content changes (e.g. new records) */
    if (body) {
      const observer = new MutationObserver(() => {
        /* Update item count badge */
        updateCollapsibleCount(toggle, section);
      });
      observer.observe(body, { childList: true, subtree: true });
    }
  });

  /* Helper: update the count badge on a collapsible toggle */
  function updateCollapsibleCount(toggle, section) {
    const labelEl = toggle.querySelector(".collapsible-label");
    if (!labelEl) return;
    const icon = toggle.dataset.icon || "";
    const label = toggle.dataset.label || "";
    const rows = section.querySelectorAll(".collapsible-body tbody tr");
    /* Don't count empty-state rows */
    const count = Array.from(rows).filter(r => !r.querySelector("td.muted")).length;
    const countBadge = count > 0 ? `<span class="collapsible-count">${count}</span>` : "";
    labelEl.innerHTML = `${icon} ${label} ${countBadge}`;
  }

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  els.signOutBtn.addEventListener("click", async () => {
    setAppError("");
    els.signOutBtn.disabled = true;
    try {
      await signOutUser();
    } catch (e) {
      setAppError(friendlyDbError(e));
      els.signOutBtn.disabled = false;
    }
  });

  els.signUpBtn.addEventListener("click", async () => {
    setAuthError("");
    const email = normalizeText(els.authEmail.value);
    const password = String(els.authPassword.value || "");
    if (!email || !password) {
      setAuthError("Please enter email and password.");
      return;
    }
    await withAuthButtonsDisabled(async () => {
      try {
        await signUpWithEmailPassword(email, password);
      } catch (e) {
        setAuthError(friendlyAuthError(e));
      }
    });
  });

  els.signInBtn.addEventListener("click", async () => {
    setAuthError("");
    const email = normalizeText(els.authEmail.value);
    const password = String(els.authPassword.value || "");
    if (!email || !password) {
      setAuthError("Please enter email and password.");
      return;
    }
    await withAuthButtonsDisabled(async () => {
      try {
        await signInWithEmailPassword(email, password);
      } catch (e) {
        setAuthError(friendlyAuthError(e));
      }
    });
  });

  els.googleBtn.addEventListener("click", async () => {
    setAuthError("");
    await withAuthButtonsDisabled(async () => {
      try {
        await signInWithGooglePopup();
      } catch (e) {
        setAuthError(friendlyAuthError(e));
      }
    });
  });

  els.categoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAppError("");
    await withDisabled([els.categorySubmitBtn, els.cancelCategoryEdit], async () => {
      try {
        if (editingCategoryId) {
          await updateCategory();
        } else {
          await addCategory();
        }
      } catch (err) {
        setAppError(friendlyDbError(err));
      }
    });
  });

  /* Track scrolling so we don't fire button clicks during scroll */
  let _catScrolling = false;
  els.categoryTbody.addEventListener("touchstart", () => { _catScrolling = false; }, { passive: true });
  els.categoryTbody.addEventListener("touchmove", () => { _catScrolling = true; }, { passive: true });

  els.categoryTbody.addEventListener("click", async (e) => {
    if (_catScrolling) { _catScrolling = false; return; }
    const btn = e.target.closest("button");
    if (btn) {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "delete-category") {
        setAppError("");
        const ok = await showConfirmToast("Delete this category? (Transactions in this category are not deleted.)");
        if (!ok) return;

        await withDisabled(btn, async () => {
          try {
            const { categories: categoriesCol } = userCollections(uid);
            const docRef = doc(categoriesCol, id);

            let backup = categories.find((c) => c.id === id) || null;
            if (!backup) {
              const snap = await getDoc(docRef);
              backup = snap.exists() ? { id: snap.id, ...snap.data() } : null;
            }

            await deleteCategoryById(id);

            if (backup) {
              const dataToRestore = stripUndefined({ ...backup });
              delete dataToRestore.id;
              showUndoToast({
                message: `Category deleted. Undo?`,
                onUndo: async () => {
                  await setDoc(docRef, dataToRestore);
                },
              });
            }
          } catch (err) {
            setAppError(friendlyDbError(err));
          }
        });
        return;
      }
      if (action === "edit-category") {
        startCategoryEdit(id);
        return;
      }
    }

    const row = e.target.closest("tr");
    const id = row?.dataset?.categoryId;
    if (!id) return;

    activeCategoryId = activeCategoryId === id ? "" : id;
    txPage = 1;
    renderCategoriesTable();
    renderTransactionsTable();

    // Mobile convenience: jump to the records section after selecting a category.
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 979px)").matches
    ) {
      const recordCard = document.querySelector(".record-card");
      if (recordCard && typeof recordCard.scrollIntoView === "function") {
        recordCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });

  els.txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAppError("");
    await withDisabled([els.txSubmitBtn, els.cancelTxEdit], async () => {
      try {
        if (editingTransactionId) {
          await updateTransaction();
        } else {
          await addTransaction();
        }
      } catch (err) {
        setAppError(friendlyDbError(err));
      }
    });
  });

  els.txTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === "delete-tx") {
      setAppError("");
      const ok = await showConfirmToast("Delete this record?");
      if (!ok) return;

      await withDisabled(btn, async () => {
        try {
          const { transactions: txCol } = userCollections(uid);
          const docRef = doc(txCol, id);

          let backup = transactions.find((t) => t.id === id) || null;
          if (!backup) {
            const snap = await getDoc(docRef);
            backup = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          }

          await deleteTransactionById(id);

          if (backup) {
            const dataToRestore = stripUndefined({ ...backup });
            delete dataToRestore.id;
            showUndoToast({
              message: "Record deleted. Undo?",
              onUndo: async () => {
                await setDoc(docRef, dataToRestore);
              },
            });
          }
        } catch (err) {
          setAppError(friendlyDbError(err));
        }
      });
      return;
    }
    if (action === "edit-tx") {
      openEditModal(id);
      return;
    }
  });

  const debouncedSearch = debounce(() => {
    searchTerm = els.searchInput.value;
    txPage = 1;
    renderTransactionsTable();
  }, 200);
  els.searchInput.addEventListener("input", debouncedSearch);

  els.clearSearchBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    searchTerm = "";
    activeCategoryId = "";
    txPage = 1;
    renderCategoriesTable();
    renderTransactionsTable();
  });

  if (els.cancelCategoryEdit) {
    els.cancelCategoryEdit.addEventListener("click", () => {
      cancelCategoryEdit();
    });
  }

  if (els.cancelTxEdit) {
    els.cancelTxEdit.addEventListener("click", () => {
      cancelTxEdit();
    });
  }

  // Edit modal event listeners
  if (els.closeEditModal) {
    els.closeEditModal.addEventListener("click", closeEditModal);
  }
  if (els.editTxCancelBtn) {
    els.editTxCancelBtn.addEventListener("click", closeEditModal);
  }
  if (els.editTxModal) {
    els.editTxModal.addEventListener("click", (e) => {
      if (e.target === els.editTxModal) closeEditModal();
    });
  }
  if (els.editTxForm) {
    els.editTxForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await saveEditModal();
      } catch (err) {
        setAppError(friendlyDbError(err));
      }
    });
  }

  if (els.txPrevBtn) {
    els.txPrevBtn.addEventListener("click", () => {
      txPage = Math.max(1, txPage - 1);
      renderTransactionsTable();
      scrollToRecordList();
    });
  }

  if (els.txNextBtn) {
    els.txNextBtn.addEventListener("click", () => {
      txPage = txPage + 1;
      renderTransactionsTable();
      scrollToRecordList();
    });
  }

  els.refreshStatsBtn.addEventListener("click", () => {
    renderStats();
  });

  els.statsRange.addEventListener("change", () => {
    setStatsInputVisibility();
    renderStats();
  });

  els.statsAnchorDate.addEventListener("change", () => {
    renderStats();
  });

  els.statsMonth.addEventListener("change", () => {
    renderStats();
  });

  els.statsYear.addEventListener("change", () => {
    renderStats();
  });

  els.budgetMonth.addEventListener("change", () => {
    renderBudgetScopeLabel();
    renderCategoriesTable();
  });

  // Duplicate detection on form input changes
  const dupFields = [els.txCategory, els.txType, els.txAmount, els.txDate];
  for (const field of dupFields) {
    if (field) field.addEventListener("change", checkDuplicate);
  }
  if (els.txAmount) els.txAmount.addEventListener("input", debounce(checkDuplicate, 300));

  // Auto-categorization on note input
  if (els.txNote) {
    els.txNote.addEventListener("input", debounce(updateAutoCategorySuggestion, 300));
  }

  // Receipt scan
  if (els.scanReceiptBtn) {
    els.scanReceiptBtn.addEventListener("click", openReceiptModal);
  }
  if (els.closeReceiptModal) {
    els.closeReceiptModal.addEventListener("click", closeReceiptModal);
  }
  if (els.receiptModal) {
    els.receiptModal.addEventListener("click", (e) => {
      if (e.target === els.receiptModal) closeReceiptModal();
    });
  }
  if (els.receiptCameraBtn) {
    els.receiptCameraBtn.addEventListener("click", startReceiptCamera);
  }
  if (els.receiptFileInput) {
    els.receiptFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      if (els.receiptPreview) {
        els.receiptPreview.src = url;
        els.receiptPreview.hidden = false;
      }
      stopReceiptCamera();
      await processReceiptImage(file);
      els.receiptFileInput.value = "";
    });
  }
  if (els.receiptCaptureBtn) {
    els.receiptCaptureBtn.addEventListener("click", async () => {
      const canvas = captureFromVideo();
      if (!canvas) return;
      if (els.receiptPreview) {
        els.receiptPreview.src = canvas.toDataURL("image/png");
        els.receiptPreview.hidden = false;
      }
      await processReceiptImage(canvas);
    });
  }
  if (els.receiptApplyBtn) {
    els.receiptApplyBtn.addEventListener("click", applyReceiptToForm);
  }
  if (els.receiptRetryBtn) {
    els.receiptRetryBtn.addEventListener("click", () => {
      if (els.receiptResult) els.receiptResult.hidden = true;
      if (els.receiptPreview) els.receiptPreview.hidden = true;
      if (els.receiptStatus) els.receiptStatus.textContent = "";
    });
  }

  // Insights
  if (els.refreshInsightsBtn) {
    els.refreshInsightsBtn.addEventListener("click", generateInsights);
  }

  // Quick-fill Today button
  if (els.todayBtn) {
    els.todayBtn.addEventListener("click", () => {
      els.txDate.value = todayISO();
    });
  }

  // Export CSV
  if (els.exportCsvBtn) {
    els.exportCsvBtn.addEventListener("click", () => {
      const term = searchTerm.trim().toLowerCase();
      let data = term
        ? transactions.filter((t) =>
            (t.note || "").toLowerCase().includes(term) ||
            (t.categoryName || "").toLowerCase().includes(term)
          )
        : transactions;
      if (activeCategoryId) {
        data = data.filter((t) => t.categoryId === activeCategoryId);
      }
      if (data.length === 0) {
        setAppError("No records to export.");
        return;
      }
      const header = "Date,Category,Type,Amount,Note";
      const csvRows = data.map((t) => {
        const note = String(t.note || "").replace(/"/g, '""');
        const cat = String(t.categoryName || "").replace(/"/g, '""');
        return `${t.dateISO},"${cat}",${t.type},${t.amount},"${note}"`;
      });
      const csv = [header, ...csvRows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `account-book-${todayISO()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Escape key cancels editing
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (editingCategoryId) { cancelCategoryEdit(); }
      if (editingTransactionId) { cancelTxEdit(); }
    }
  });
}

async function main() {
  initTheme();

  els.txDate.value = todayISO();
  els.statsAnchorDate.value = todayISO();
  els.statsMonth.value = currentMonthValue();
  setStatsInputVisibility();
  ensureStatsYearOptions();

  els.budgetMonth.value = currentMonthValue();
  renderBudgetScopeLabel();

  wireEvents();
  wireAssistantEvents();

  const init = await initFirebase();
  if (!init.ok) {
    setWarning(init.reason);
    setAuthStatus("Firebase not configured");
    return;
  }

  if (init.redirectError) {
    setAuthError(friendlyAuthError(init.redirectError));
  }

  if (init.persistenceMode === "memory") {
    // In-memory persistence means auth state is lost on full page reload/redirect.
    // This commonly happens in in-app browsers or when storage/cookies are blocked.
    setAuthError(
      "This browser is blocking storage/cookies, so sign-in may not persist. Open this site in Chrome/Safari (not an in-app browser) and try again."
    );
  }

  setWarning("");
  setAuthStatus("Checking session…");

  watchAuth(async (user) => {
    if (!user) {
      setAuthStatus("Signed out");
      setSignedOutUi();
      return;
    }

    const label = user.email || user.displayName || "Signed in";
    setAuthStatus(`Signed in: ${label}`);
    await setSignedInUi(user);
  });
}

main();
