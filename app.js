"use strict";

/* ==========================================================
   Гол+Пас menu, app.js

   What this file does:
   1. Loads menu.json (all dishes, prices and texts).
   2. Copies the templates from index.html and fills them in.
   3. Handles clicks: language, menu tab, section buttons.

   To change a dish or a price, edit menu.json, not this file.
   To change how things look, edit index.html and styles.css.
   ========================================================== */


/* ----------------------------------------------------------
   State: what the page remembers right now
   ---------------------------------------------------------- */

const state = {
  data: null,        // the content of menu.json
  language: "ru",    // current language code
  menuId: null,      // current menu, for example "main" or "bar"
  activeSection: null,  // the highlighted section button
  jumpingTo: null,      // set while the page scrolls to a tapped section
  scrollFrame: null
};


/* ----------------------------------------------------------
   Small helpers
   ---------------------------------------------------------- */

const byId = (id) => document.getElementById(id);

// Makes a fresh copy of a <template> from index.html
const fromTemplate = (id) => byId(id).content.firstElementChild.cloneNode(true);

// Returns the text in the current language.
// If a translation is missing, the Russian text is used.
function text(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[state.language] || value.ru || "";
}

function currentMenu() {
  return state.data.menus.find((menu) => menu.id === state.menuId);
}


/* ----------------------------------------------------------
   Prices
   menu.json stores the ORIGINAL price (basePrice).
   The price shown on the page = basePrice x markup, rounded to the step.
   Change "markup" and "step" in menu.json to change all prices.
   ---------------------------------------------------------- */

function finalPrice(basePrice) {
  const { markup, step } = state.data.settings;
  return Math.round((basePrice * markup) / step) * step;
}

// Puts a separator between thousands: 12600 -> "12 600"
function groupThousands(number, separator) {
  return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

// "12 600 ₸"  (non breaking spaces, so the price never splits into two lines)
function formatPrice(basePrice) {
  const { currency } = state.data.settings;
  return groupThousands(finalPrice(basePrice), "\u00A0") + "\u00A0" + currency;
}

// "(7.550-19.500₸)" for dishes sold by weight with a price range
function formatPriceRange([from, to]) {
  const { currency } = state.data.settings;
  return " (" + groupThousands(finalPrice(from), ".") + "-" + groupThousands(finalPrice(to), ".") + currency + ")";
}

// Label of a price variant. Three ways to write it in menu.json:
//   "glass"           a name from ui.labels
//   "0,5 {l}"         a text where {l} and {g} become the unit in the current language
//   { "ru": "..." }   a text in every language
function variantLabel(label) {
  const { labels, units } = state.data.ui;
  const base = typeof label === "string" && labels[label] ? text(labels[label]) : text(label);
  const withUnits = base.replace(/\{(\w+)\}/g, (match, key) => text(units[key]) || match);
  // English writes decimals with a point: "0,5 l" -> "0.5 l"
  return state.language === "en" ? withUnits.replace(/(\d),(\d)/g, "$1.$2") : withUnits;
}


/* ----------------------------------------------------------
   Drawing the page
   ---------------------------------------------------------- */

// Makes a button from the template and puts it in a container
function addButton(container, label, dataName, dataValue, isActive) {
  const button = fromTemplate("tpl-button");
  button.textContent = label;
  button.dataset[dataName] = dataValue;
  button.classList.toggle("is-active", isActive);
  container.append(button);
}

function renderHeader() {
  const { ui, menus, languages } = state.data;

  byId("site-title").textContent = text(ui.title);
  document.documentElement.lang = state.language;
  document.title = text(ui.title) + " · " + text(currentMenu().title);

  // Menu tabs (hidden when there is only one menu)
  const tabs = byId("menu-tabs");
  tabs.replaceChildren();
  tabs.hidden = menus.length < 2;
  menus.forEach((menu) => addButton(tabs, text(menu.title), "menu", menu.id, menu.id === state.menuId));

  // Language buttons
  const switcher = byId("language-switch");
  switcher.replaceChildren();
  languages.forEach((lang) => addButton(switcher, lang.label, "language", lang.code, lang.code === state.language));
}

function renderSectionBar() {
  const bar = byId("section-nav");
  bar.replaceChildren();
  currentMenu().sections.forEach((section) => addButton(bar, text(section.title), "section", section.id, false));
}

function renderDish(dish) {
  const { ui } = state.data;
  const element = fromTemplate("tpl-dish");
  const find = (selector) => element.querySelector(selector);

  // Photo: use the real image if the dish has one
  if (dish.photo) {
    const image = document.createElement("img");
    image.className = "dish__photo";
    image.src = dish.photo;
    image.alt = text(dish.name);
    image.loading = "lazy";
    find(".dish__photo").replaceWith(image);
  }

  // Name, with the price range if there is one
  find(".dish__title").textContent = text(dish.name) + (dish.basePriceRange ? formatPriceRange(dish.basePriceRange) : "");

  // Badge ("new", "spicy")
  if (dish.tag) {
    find(".dish__badge").textContent = text(ui.tags[dish.tag]);
  } else {
    find(".dish__badge").remove();
  }

  // One price, or a list of prices
  if (dish.variants) {
    find(".dish__price").remove();
    dish.variants.forEach((variant) => {
      const row = fromTemplate("tpl-variant");
      row.querySelector(".variant__price").textContent = formatPrice(variant.basePrice);
      row.querySelector(".variant__label").textContent = variantLabel(variant.label);
      find(".dish__variants").append(row);
    });
  } else {
    find(".dish__variants").remove();
    find(".dish__price").textContent = formatPrice(dish.basePrice);
  }

  // Description, with the note in front ("price per 100 g")
  const note = dish.note ? text(ui.notes[dish.note]) : "";
  const description = [note, text(dish.description)].filter(Boolean).join(" ");
  if (description) {
    find(".dish__description").textContent = description;
  } else {
    find(".dish__description").remove();
  }

  return element;
}

function renderMenu() {
  const menu = byId("menu");
  menu.replaceChildren();

  currentMenu().sections.forEach((section) => {
    const element = fromTemplate("tpl-section");
    element.id = section.id;
    element.querySelector(".menu-section__title").textContent = text(section.title);
    section.items.forEach((dish) => element.querySelector(".menu-section__dishes").append(renderDish(dish)));
    menu.append(element);
  });
}

// Highlights the button of the section you are reading,
// and slides the section bar sideways so that button is visible.
// It only moves the bar, never the page, so it does not fight your scrolling.
function setActiveSection(id) {
  if (id === state.activeSection) return;
  state.activeSection = id;

  const bar = byId("section-nav");
  bar.querySelectorAll(".button").forEach((button) => button.classList.toggle("is-active", button.dataset.section === id));

  const active = bar.querySelector(".is-active");
  if (active) {
    const left = active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }
}

// Which section is under the section bar right now
function sectionUnderBar() {
  const sections = byId("menu").querySelectorAll(".menu-section");
  if (!sections.length) return null;

  // At the very bottom of the page, the last section counts as current
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom) return sections[sections.length - 1].id;

  const line = byId("section-nav").getBoundingClientRect().bottom + 24;
  let current = sections[0];
  sections.forEach((section) => { if (section.getBoundingClientRect().top <= line) current = section; });
  return current.id;
}

// While the page scrolls after a section button tap, keep that button highlighted
function onScroll() {
  if (state.scrollFrame) return;
  state.scrollFrame = requestAnimationFrame(() => {
    state.scrollFrame = null;
    if (state.jumpingTo) return;
    const id = sectionUnderBar();
    if (id) setActiveSection(id);
  });
}

window.addEventListener("scroll", onScroll, { passive: true });

// Back to top button: shows after scrolling down about one screen
const toTop = byId("to-top");
function updateToTop() {
  const show = window.scrollY > window.innerHeight * 0.8;
  toTop.classList.toggle("is-visible", show);
  toTop.hidden = !show;
}
window.addEventListener("scroll", updateToTop, { passive: true });
toTop.addEventListener("click", () => {
  state.jumpingTo = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// If the guest scrolls by hand during a jump, follow them again right away
["wheel", "touchstart", "keydown"].forEach((type) =>
  window.addEventListener(type, () => { state.jumpingTo = null; }, { passive: true })
);

// The jump is over when scrolling stops
let jumpTimer = null;
window.addEventListener("scroll", () => {
  if (!state.jumpingTo) return;
  clearTimeout(jumpTimer);
  jumpTimer = setTimeout(() => { state.jumpingTo = null; onScroll(); }, 150);
}, { passive: true });

function render() {
  state.activeSection = null;
  renderHeader();
  renderSectionBar();
  renderMenu();
  setActiveSection(currentMenu().sections[0].id);
}


/* ----------------------------------------------------------
   Clicks
   ---------------------------------------------------------- */

byId("section-nav").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.section;
  state.jumpingTo = id;
  setActiveSection(id);
  byId(id).scrollIntoView({ behavior: "smooth" });
  // If the page cannot scroll any further (short last section), release the lock anyway
  clearTimeout(jumpTimer);
  jumpTimer = setTimeout(() => { state.jumpingTo = null; }, 1200);
});

byId("menu-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.menuId = button.dataset.menu;
  render();
  window.scrollTo({ top: 0 });
});

byId("language-switch").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.language = button.dataset.language;
  try { localStorage.setItem("language", state.language); } catch (error) { /* storage can be blocked */ }
  render();
});


/* ----------------------------------------------------------
   Start
   ---------------------------------------------------------- */

// Saved choice, then the phone language, then the default from menu.json
function chooseLanguage(data) {
  const codes = data.languages.map((lang) => lang.code);
  try {
    const saved = localStorage.getItem("language");
    if (codes.includes(saved)) return saved;
  } catch (error) { /* ignore */ }
  const phoneLanguage = (navigator.language || "").slice(0, 2);
  return codes.includes(phoneLanguage) ? phoneLanguage : data.settings.defaultLanguage;
}

function showError(message) {
  const box = document.createElement("p");
  box.className = "message";
  box.textContent = message;
  byId("menu").replaceChildren(box);
}

// "no-cache" makes the browser check for a newer menu.json every time,
// so guests see new prices right after you upload them
fetch("menu.json", { cache: "no-cache" })
  .then((response) => {
    if (!response.ok) throw new Error("menu.json not found");
    return response.json();
  })
  .then((data) => {
    state.data = data;
    state.language = chooseLanguage(data);
    state.menuId = data.menus[0].id;
    render();
  })
  .catch((error) => {
    showError("Could not load the menu (" + error.message + "). If you opened index.html by double clicking it, open it through a web server instead (see README).");
  });
