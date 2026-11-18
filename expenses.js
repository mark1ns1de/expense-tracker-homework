"use strict";

const categories = {
  "Їжа": { className: "food", icon: "Ї" },
  "Транспорт": { className: "transport", icon: "Т" },
  "Покупки": { className: "shopping", icon: "П" },
  "Інше": { className: "other", icon: "І" },
};

const storageKey = "expense-tracker-v1";
const currencyFormat = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const form = document.getElementById("expense-form");
const nameInput = document.getElementById("expense-name");
const amountInput = document.getElementById("expense-amount");
const categoryInput = document.getElementById("expense-category");
const categoryFilter = document.getElementById("category-filter");
const searchInput = document.getElementById("expense-search");
const list = document.getElementById("expense-list");
const emptyMessage = document.getElementById("list-empty");
const clearButton = document.getElementById("clear-expenses");
const statusMessage = document.getElementById("expense-status");

let expenses = [];
form.noValidate = true;

function hasCategory(category) {
  return Object.prototype.hasOwnProperty.call(categories, category);
}

function formatMoney(kopecks) {
  return currencyFormat.format(kopecks / 100) + " грн";
}

// Зберігаємо цілі копійки, щоб точно додавати суми на зразок 0,10 і 0,20 грн.
function readAmount(value) {
  const text = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const [hryvnias, fraction = ""] = text.split(".");
  const kopecks = Number(hryvnias + fraction.padEnd(2, "0"));
  return Number.isSafeInteger(kopecks) && kopecks > 0 ? kopecks : null;
}

function isValidExpense(expense) {
  return expense && typeof expense.name === "string" && expense.name.trim() &&
    Number.isSafeInteger(expense.kopecks) && expense.kopecks > 0 &&
    hasCategory(expense.category);
}

function loadState() {
  let saved;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    statusMessage.textContent = "Сховище браузера недоступне. Зміни діятимуть лише на цій сторінці.";
    return;
  }
  if (saved === null) return;

  try {
    const state = JSON.parse(saved);
    if (!state || !Array.isArray(state.expenses)) throw new Error();
    expenses = state.expenses.filter(isValidExpense);
    if (expenses.length < state.expenses.length) {
      statusMessage.textContent = "Відновлено лише коректно збережені записи.";
    }
    categoryFilter.value = hasCategory(state.filter) ? state.filter : "";
    searchInput.value = typeof state.search === "string" ? state.search : "";
  } catch {
    statusMessage.textContent = "Не вдалося прочитати збережені дані. Можна почати новий список.";
  }
}

function saveState(message = "") {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      expenses,
      filter: categoryFilter.value,
      search: searchInput.value,
    }));
    statusMessage.textContent = message;
  } catch {
    statusMessage.textContent = "Не вдалося зберегти зміни у браузері. Вони діятимуть лише на цій сторінці.";
  }
}

function renderSummary() {
  let total = 0;
  const sums = {};
  for (const category of Object.keys(categories)) sums[category] = 0;
  for (const expense of expenses) {
    total += expense.kopecks;
    sums[expense.category] += expense.kopecks;
  }

  document.getElementById("expense-total").textContent = formatMoney(total);
  document.getElementById("expense-count").textContent = "Записів: " + expenses.length;
  for (const row of document.querySelectorAll("#category-stats [data-category]")) {
    const sum = sums[row.dataset.category];
    row.querySelector(".stat-value").textContent = formatMoney(sum);
    row.querySelector(".stat-fill").style.width = (total ? 100 * sum / total : 0) + "%";
  }
  clearButton.disabled = expenses.length === 0;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeExpenseRow(expense) {
  const category = categories[expense.category];
  const row = makeElement("li", "expense-row");
  const icon = makeElement("span", "category-icon " + category.className, category.icon);
  icon.setAttribute("aria-hidden", "true");

  const detail = makeElement("div", "expense-detail");
  detail.append(
    makeElement("span", "expense-title", expense.name),
    makeElement("span", "expense-category", expense.category),
  );
  const amount = makeElement("span", "expense-value", formatMoney(expense.kopecks));
  const removeButton = makeElement("button", "delete-expense", "×");
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", "Видалити витрату «" + expense.name + "»");
  removeButton.addEventListener("click", () => {
    expenses = expenses.filter((item) => item !== expense);
    renderSummary();
    renderList();
    saveState("Витрату «" + expense.name + "» видалено.");
  });
  row.append(icon, detail, amount, removeButton);
  return row;
}

function renderList() {
  const query = searchInput.value.trim().toLocaleLowerCase("uk");
  const visible = expenses.filter((expense) => {
    const matchesCategory = !categoryFilter.value || expense.category === categoryFilter.value;
    return matchesCategory && expense.name.toLocaleLowerCase("uk").includes(query);
  });
  list.replaceChildren(...visible.map(makeExpenseRow));
  emptyMessage.hidden = visible.length > 0;
  if (!visible.length) {
    emptyMessage.textContent = expenses.length
      ? "Витрат за цим запитом не знайдено. Змініть пошук або категорію."
      : "Витрат ще немає. Додайте першу витрату.";
  }
}

function setError(input, errorId, message) {
  const error = document.getElementById(errorId);
  error.textContent = message;
  error.hidden = !message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateField(input) {
  if (input === nameInput) {
    setError(input, "name-error", input.value.trim() ? "" : "Введіть назву витрати.");
  } else if (input === amountInput) {
    setError(input, "amount-error", readAmount(input.value) === null
      ? "Введіть додатну суму з точністю до копійок, наприклад 125,50." : "");
  } else {
    setError(input, "category-error", hasCategory(input.value) ? "" : "Виберіть категорію.");
  }
}

const fields = [nameInput, amountInput, categoryInput];
for (const input of fields) {
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid") === "true") validateField(input);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  fields.forEach(validateField);
  const invalid = fields.find((input) => input.getAttribute("aria-invalid") === "true");
  if (invalid) {
    invalid.focus();
    return;
  }

  expenses.unshift({
    name: nameInput.value.trim(),
    kopecks: readAmount(amountInput.value),
    category: categoryInput.value,
  });
  form.reset();
  renderSummary();
  renderList();
  saveState("Витрату додано.");
  nameInput.focus();
});

function updateFilters() {
  renderList();
  saveState();
}
categoryFilter.addEventListener("change", updateFilters);
searchInput.addEventListener("input", updateFilters);

clearButton.addEventListener("click", () => {
  if (!expenses.length || !window.confirm("Видалити всі витрати?")) return;
  expenses = [];
  renderSummary();
  renderList();
  saveState("Усі витрати видалено.");
});

const today = new Date();
const dateLabel = document.getElementById("today");
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");
dateLabel.dateTime = [today.getFullYear(), month, day].join("-");
dateLabel.textContent = new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(today);

loadState();
renderSummary();
renderList();
