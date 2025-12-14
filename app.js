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

  categoryForm: document.getElementById("categoryForm"),
  categoryName: document.getElementById("categoryName"),
  categoryBudget: document.getElementById("categoryBudget"),
  categoryPeriod: document.getElementById("categoryPeriod"),
  categoryTbody: document.getElementById("categoryTbody"),

  budgetMonth: document.getElementById("budgetMonth"),
  budgetYear: document.getElementById("budgetYear"),
  budgetScope: document.getElementById("budgetScope"),

  txForm: document.getElementById("txForm"),
  txCategory: document.getElementById("txCategory"),
  txType: document.getElementById("txType"),
  txAmount: document.getElementById("txAmount"),
  txNote: document.getElementById("txNote"),
  txDate: document.getElementById("txDate"),
  txTbody: document.getElementById("txTbody"),

  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),

  statsRange: document.getElementById("statsRange"),
  statsDateField: document.getElementById("statsDateField"),
  statsAnchorDate: document.getElementById("statsAnchorDate"),
  statsMonthField: document.getElementById("statsMonthField"),
  statsMonth: document.getElementById("statsMonth"),
  statsYearField: document.getElementById("statsYearField"),
  statsYear: document.getElementById("statsYear"),
  refreshStatsBtn: document.getElementById("refreshStatsBtn"),
  totalExpense: document.getElementById("totalExpense"),
  totalRevenue: document.getElementById("totalRevenue"),
  netTotal: document.getElementById("netTotal"),
  statsTbody: document.getElementById("statsTbody"),
};

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
    els.themeToggleBtn.textContent = `Dark mode: ${isDark ? "On" : "Off"}`;
  }
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

function budgetYearRefDate() {
  const y = Number(els.budgetYear.value);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const d = new Date(year, 0, 1);
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

function ensureBudgetYearOptions() {
  const years = yearsWithRecords();
  const current = new Date().getFullYear();
  if (!years.includes(current)) years.unshift(current);

  const prev = els.budgetYear.value;
  els.budgetYear.innerHTML = "";

  for (const y of years) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    els.budgetYear.appendChild(opt);
  }

  if (prev && years.includes(Number(prev))) {
    els.budgetYear.value = prev;
  } else {
    els.budgetYear.value = String(years[0] || current);
  }
}

function renderBudgetScopeLabel() {
  const monthValue = els.budgetMonth.value || currentMonthValue();
  const yearValue = els.budgetYear.value || String(new Date().getFullYear());
  els.budgetScope.textContent = `Monthly budgets: ${monthValue} • Yearly budgets: ${yearValue}`;
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

  for (const c of categories) {
    const period = c.budgetPeriod || "month";
    const refDate =
      period === "month"
        ? budgetMonthRefDate()
        : period === "year"
          ? budgetYearRefDate()
          : null;
    const { spent, income, balance } = computeCategoryTotals(c.id, period, refDate);
    const effectiveBudgetBalance = (c.budget || 0) + balance; // budget + revenue - expense

    const periodLabel =
      period === "month"
        ? `Monthly (${els.budgetMonth.value || currentMonthValue()})`
        : period === "year"
          ? `Yearly (${els.budgetYear.value || new Date().getFullYear()})`
          : "Lifetime";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(periodLabel)}</td>
      <td class="right">${money(c.budget || 0)}</td>
      <td class="right">${money(spent)}</td>
      <td class="right">${money(income)}</td>
      <td class="right">${money(effectiveBudgetBalance)}</td>
      <td class="right">
        <button class="btn btn-danger" type="button" data-action="delete-category" data-id="${c.id}">Delete</button>
      </td>
    `;
    els.categoryTbody.appendChild(tr);
  }
}

function renderTransactionsTable() {
  els.txTbody.innerHTML = "";

  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? transactions.filter((t) => (t.note || "").toLowerCase().includes(term))
    : transactions;

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">No records found.</td>`;
    els.txTbody.appendChild(tr);
    return;
  }

  for (const tx of filtered) {
    const tr = document.createElement("tr");
    const typeLabel = tx.type === "expense" ? "Expense" : "Revenue";
    tr.innerHTML = `
      <td>${escapeHtml(tx.dateISO)}</td>
      <td>${escapeHtml(tx.categoryName || "")}</td>
      <td>${escapeHtml(typeLabel)}</td>
      <td class="right">${money(tx.amount)}</td>
      <td>${escapeHtml(tx.note || "")}</td>
      <td class="right">
        <button class="btn btn-danger" type="button" data-action="delete-tx" data-id="${tx.id}">Delete</button>
      </td>
    `;
    els.txTbody.appendChild(tr);
  }
}

function renderStats() {
  const range = els.statsRange.value;
  const { start, endExclusive } = rangeForUi(range);

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
  els.totalRevenue.textContent = money(totalRevenue);
  els.netTotal.textContent = money(totalRevenue - totalExpense);

  els.statsTbody.innerHTML = "";

  const rows = [...byCategory.values()].sort((a, b) => {
    const netA = a.revenue - a.expense;
    const netB = b.revenue - b.expense;
    return Math.abs(netB) - Math.abs(netA);
  });

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" class="muted">No records in this range.</td>`;
    els.statsTbody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(r.categoryName)}</td>
      <td class="right">${money(r.expense)}</td>
      <td class="right">${money(r.revenue)}</td>
      <td class="right">${money(r.revenue - r.expense)}</td>
    `;
    els.statsTbody.appendChild(tr);
  }
}

function renderAll() {
  renderCategorySelect();
  renderCategoriesTable();
  renderTransactionsTable();
  renderStats();
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
    ensureBudgetYearOptions();
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
  ensureStatsYearOptions();
  ensureBudgetYearOptions();
  renderBudgetScopeLabel();
  els.appContent.hidden = true;
  els.authCard.hidden = false;
  els.signOutBtn.disabled = true;
  setAuthError("");
}

async function setSignedInUi(user) {
  uid = user.uid;
  els.authCard.hidden = true;
  els.appContent.hidden = false;
  els.signOutBtn.disabled = false;
  await startListenersForUser(uid);
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code === "auth/invalid-credential") return "Wrong email or password.";
  if (code === "auth/user-not-found") return "No account found for this email.";
  if (code === "auth/wrong-password") return "Wrong email or password.";
  if (code === "auth/email-already-in-use") return "Email already in use. Try signing in.";
  if (code === "auth/weak-password") return "Password is too weak (min 6 characters).";
  if (code === "auth/popup-closed-by-user") return "Google sign-in popup was closed.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorized in Firebase Auth.";
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

  els.txAmount.value = "";
  els.txNote.value = "";
  els.txAmount.focus();
}

async function deleteTransactionById(txId) {
  const { transactions: txCol } = userCollections(uid);
  await deleteDoc(doc(txCol, txId));
}

function wireEvents() {
  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  els.signOutBtn.addEventListener("click", async () => {
    els.signOutBtn.disabled = true;
    await signOutUser();
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
    await addCategory();
  });

  els.categoryTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.action !== "delete-category") return;
    await deleteCategoryById(btn.dataset.id);
  });

  els.txForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addTransaction();
  });

  els.txTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.action !== "delete-tx") return;
    await deleteTransactionById(btn.dataset.id);
  });

  els.searchInput.addEventListener("input", () => {
    searchTerm = els.searchInput.value;
    renderTransactionsTable();
  });

  els.clearSearchBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    searchTerm = "";
    renderTransactionsTable();
  });

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

  els.budgetYear.addEventListener("change", () => {
    renderBudgetScopeLabel();
    renderCategoriesTable();
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
  ensureBudgetYearOptions();
  renderBudgetScopeLabel();

  wireEvents();

  const init = await initFirebase();
  if (!init.ok) {
    setWarning(init.reason);
    setAuthStatus("Firebase not configured");
    return;
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
