"use strict";

const form = document.querySelector(".registration-form");
const fields = form.querySelectorAll("input");
const password = document.getElementById("password");
const confirmation = document.getElementById("confirm-password");
const success = document.querySelector(".success");
const touchedFields = new Set();

function getError(field) {
  switch (field.id) {
    case "username":
      if (field.value.trim().length < 3) return "Введіть ім’я довжиною щонайменше 3 символи.";
      break;
    case "email":
      if (!field.value) return "Введіть електронну адресу.";
      if (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        return "Перевірте формат електронної адреси. Наприклад, name@example.com.";
      }
      break;
    case "password":
      if (field.value.length < 8) return "Введіть пароль довжиною щонайменше 8 символів.";
      break;
    case "confirm-password":
      if (!field.value) return "Повторіть пароль.";
      if (field.value !== password.value) return "Паролі не збігаються.";
      break;
    case "terms":
      if (!field.checked) return "Підтвердьте згоду з умовами.";
      break;
  }
  return "";
}

function validateField(field) {
  const error = getError(field);
  document.getElementById(field.id + "-error").textContent = error;
  field.setAttribute("aria-invalid", String(Boolean(error)));
  return !error;
}

for (const field of fields) {
  field.addEventListener("blur", () => {
    touchedFields.add(field);
    validateField(field);
  });

  field.addEventListener("input", () => {
    success.hidden = true;
    if (touchedFields.has(field)) validateField(field);
    if (field === password && touchedFields.has(confirmation)) validateField(confirmation);
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  let firstInvalid = null;

  for (const field of fields) {
    touchedFields.add(field);
    if (!validateField(field) && !firstInvalid) firstInvalid = field;
  }

  if (firstInvalid) {
    success.hidden = true;
    firstInvalid.focus();
    return;
  }

  success.hidden = false;
  success.focus();
  form.reset();
  touchedFields.clear();
});
