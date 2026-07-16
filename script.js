const STORAGE_KEY = "avenir-comptes-v6";
const LEGACY_STORAGE_KEY = "avenir-comptes-v5";
const UPDATED_KEY = "avenir-derniere-mise-a-jour-v6";
const LEGACY_UPDATED_KEY = "avenir-derniere-mise-a-jour-v5";

const ICONS = {
  "revolut": "./revolut.png",
  "livret-a": "./livret-a.png",
  "ldd": "./ldd.png",
  "lep": "./lep.png",
  "assurance-vie": "./assurance-vie.png",
  "msci": "./msci.png",
  "per": "./per.png"
};

const DEFAULT_ACCOUNTS = [
  { icon: "revolut", name: "REVOLUT", amount: 8446.36 },
  { icon: "livret-a", name: "LCL - Livret A", amount: 26003.44 },
  { icon: "ldd", name: "LCL - LDD", amount: 12747.87 },
  { icon: "lep", name: "LCL - LEP", amount: 10856.51 },
  { icon: "assurance-vie", name: "LINXEA - Fonds", amount: 20334.56 },
  { icon: "msci", name: "LINXEA - MSCI", amount: 5589.54 },
  { icon: "per", name: "LINXEA - PER", amount: 10017.55 }
];

const accountsList = document.getElementById("accountsList");
const totalAmount = document.getElementById("totalAmount");
const lastUpdated = document.getElementById("lastUpdated");
const openSettingsButton = document.getElementById("openSettingsButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsAccounts = document.getElementById("settingsAccounts");
const addAccountButton = document.getElementById("addAccountButton");
const saveSettingsButton = document.getElementById("saveSettingsButton");
const accountCardTemplate = document.getElementById("accountCardTemplate");
const settingsAccountTemplate = document.getElementById("settingsAccountTemplate");
const msciNoteOverlay =
  document.getElementById("msciNoteOverlay");

const msciNoteText =
  document.getElementById("msciNoteText");

const closeMsciNoteButton =
  document.getElementById("closeMsciNoteButton");

const MSCI_NOTE_KEY = "avenir-msci-note";

let accounts = loadAccounts();

function cloneDefaults() {
  return DEFAULT_ACCOUNTS.map(account => ({ ...account }));
}

function parseAmount(value) {
  const cleaned = String(value)
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatAmount(value) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
}

function inferIcon(account) {
  if (account.icon && ICONS[account.icon]) return account.icon;

  const name = String(account.name || "").toLowerCase();
  if (name.includes("revolut")) return "revolut";
  if (name.includes("livret a") || name === "livrets") return "livret-a";
  if (name.includes("ldd") || name.includes("ldds")) return "ldd";
  if (name.includes("lep")) return "lep";
  if (name.includes("msci") || name.includes("world")) return "msci";
  if (name.includes("per")) return "per";
  if (name.includes("assurance") || name.includes("fonds euro")) return "assurance-vie";
  return "revolut";
}

function normalizeAccount(account) {
  return {
    icon: inferIcon(account),
    name: account.name || "Compte",
    amount: parseAmount(account.amount)
  };
}

function loadAccounts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  const source = saved || legacy;

  if (!source) return cloneDefaults();

  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed)) throw new Error("Format incorrect");

    const normalized = parsed.map(normalizeAccount);

    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch (error) {
    console.error("Erreur de chargement :", error);
    return cloneDefaults();
  }
}

function saveAccounts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

  const now = new Date();
  localStorage.setItem(UPDATED_KEY, now.toISOString());
  lastUpdated.textContent = formatDate(now);
}

function renderLastUpdated() {
  const saved = localStorage.getItem(UPDATED_KEY) || localStorage.getItem(LEGACY_UPDATED_KEY);

  if (!saved) {
    lastUpdated.textContent = formatDate(new Date());
    return;
  }

  const parsed = new Date(saved);
  lastUpdated.textContent = Number.isNaN(parsed.getTime())
    ? formatDate(new Date())
    : formatDate(parsed);
}

function calculateTotal() {
  return accounts.reduce(
    (total, account) => total + parseAmount(account.amount),
    0
  );
}

function renderAccounts() {
  accountsList.innerHTML = "";

  accounts.forEach(account => {
    const fragment = accountCardTemplate.content.cloneNode(true);
    const icon = fragment.querySelector(".account-icon");

    icon.src = ICONS[account.icon] || ICONS.revolut;
    icon.alt = account.name;
    fragment.querySelector(".account-name").textContent = account.name;
    fragment.querySelector(".account-amount").textContent = formatAmount(account.amount);

    accountsList.appendChild(fragment);
  });

  totalAmount.textContent = `${formatAmount(calculateTotal())} €`;
}

function renderSettings() {
  settingsAccounts.innerHTML = "";

  accounts.forEach((account, index) => {
    const fragment = settingsAccountTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".settings-account-row");
    const iconSelect = fragment.querySelector(".icon-select");
    const nameInput = fragment.querySelector(".name-input");
    const amountInput = fragment.querySelector(".amount-input");
    const deleteButton = fragment.querySelector(".delete-account-button");

    iconSelect.value = account.icon;
    nameInput.value = account.name;
    amountInput.value = formatAmount(account.amount);
    row.dataset.index = index;

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(`Supprimer le compte « ${account.name} » ?`);
      if (!confirmed) return;

      readSettingsValues();
      accounts.splice(index, 1);
      saveAccounts();
      renderAccounts();
      renderSettings();
    });

    settingsAccounts.appendChild(fragment);
  });
}

function readSettingsValues() {
  const rows = [...settingsAccounts.querySelectorAll(".settings-account-row")];

  accounts = rows.map(row => ({
    icon: row.querySelector(".icon-select").value || "revolut",
    name: row.querySelector(".name-input").value.trim() || "Compte",
    amount: parseAmount(row.querySelector(".amount-input").value)
  }));
}

function saveFromSettings() {
  readSettingsValues();
  saveAccounts();
  renderAccounts();
}

function openSettings() {
  openSettingsButton.classList.add("is-turning");

  window.setTimeout(() => {
    renderSettings();
    settingsOverlay.hidden = false;
    document.body.classList.add("settings-open");

    window.setTimeout(() => {
      openSettingsButton.classList.remove("is-turning");
    }, 250);
  }, 180);
}

function closeSettings() {
  saveFromSettings();
  settingsOverlay.hidden = true;
  document.body.classList.remove("settings-open");
}

function addAccount() {
  readSettingsValues();

  accounts.push({
    icon: "revolut",
    name: "Nouveau compte",
    amount: 0
  });

  saveAccounts();
  renderAccounts();
  renderSettings();

  const rows = settingsAccounts.querySelectorAll(".settings-account-row");
  const newRow = rows[rows.length - 1];

  if (newRow) {
    newRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

let draggedSettingsRow = null;
let draggedPointerId = null;

settingsAccounts.addEventListener("pointerdown", event => {
  const handle = event.target.closest(".drag-handle");

  if (!handle) return;

  const row = handle.closest(".settings-account-row");

  if (!row) return;

  event.preventDefault();

  draggedSettingsRow = row;
  draggedPointerId = event.pointerId;

  row.classList.add("is-dragging");
  document.body.classList.add("account-drag-active");

  if ("vibrate" in navigator) {
    navigator.vibrate(40);
  }
});

document.addEventListener(
  "pointermove",
  event => {
    if (
      !draggedSettingsRow ||
      event.pointerId !== draggedPointerId
    ) {
      return;
    }

    event.preventDefault();

    const elementUnderFinger =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      );

    const targetRow =
      elementUnderFinger?.closest(
        ".settings-account-row"
      );

    if (
      !targetRow ||
      targetRow === draggedSettingsRow ||
      !settingsAccounts.contains(targetRow)
    ) {
      return;
    }

    const targetBox =
      targetRow.getBoundingClientRect();

    const placeBefore =
      event.clientY <
      targetBox.top + targetBox.height / 2;

    if (placeBefore) {
      settingsAccounts.insertBefore(
        draggedSettingsRow,
        targetRow
      );
    } else {
      settingsAccounts.insertBefore(
        draggedSettingsRow,
        targetRow.nextSibling
      );
    }
  },
  { passive: false }
);

function finishAccountDrag(event) {
  if (
    !draggedSettingsRow ||
    event.pointerId !== draggedPointerId
  ) {
    return;
  }

  draggedSettingsRow.classList.remove(
    "is-dragging"
  );

  document.body.classList.remove(
    "account-drag-active"
  );

  draggedSettingsRow = null;
  draggedPointerId = null;

  readSettingsValues();
  saveAccounts();
  renderAccounts();
  renderSettings();
}

document.addEventListener(
  "pointerup",
  finishAccountDrag
);

document.addEventListener(
  "pointercancel",
  finishAccountDrag
);

openSettingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
saveSettingsButton.addEventListener("click", closeSettings);
addAccountButton.addEventListener("click", addAccount);

settingsOverlay.addEventListener("click", event => {
  if (event.target === settingsOverlay) closeSettings();
});

settingsAccounts.addEventListener("input", () => {
  readSettingsValues();
  saveAccounts();
  renderAccounts();
});

settingsAccounts.addEventListener("change", () => {
  readSettingsValues();
  saveAccounts();
  renderAccounts();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !settingsOverlay.hidden) closeSettings();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.error("Erreur du Service Worker :", error);
    });
  });
}

renderAccounts();
renderLastUpdated();
accountsList.addEventListener("pointerdown", event => {
  const card = event.target.closest(".account-card");
  if (card) card.classList.add("pressed");
});

function clearPressedCards() {
  document.querySelectorAll(".account-card.pressed").forEach(card => {
    card.classList.remove("pressed");
  });
}

document.addEventListener("pointerup", clearPressedCards);
document.addEventListener("pointercancel", clearPressedCards);

msciNoteText.value =
  localStorage.getItem(MSCI_NOTE_KEY) || "";

accountsList.addEventListener("click", event => {
  const card = event.target.closest(".account-card");

  if (!card) {
    return;
  }

  const nameElement =
    card.querySelector(".account-name");

  const accountName =
    nameElement?.textContent?.toLowerCase() || "";

  if (!accountName.includes("msci")) {
    return;
  }

  msciNoteOverlay.hidden = false;
  msciNoteText.focus();
});

msciNoteText.addEventListener("input", () => {
  localStorage.setItem(
    MSCI_NOTE_KEY,
    msciNoteText.value
  );
});

closeMsciNoteButton.addEventListener("click", () => {
  msciNoteOverlay.hidden = true;
});

msciNoteOverlay.addEventListener("click", event => {
  if (event.target === msciNoteOverlay) {
    msciNoteOverlay.hidden = true;
  }
});


/* ===== AV€NIR v8.1 : fermeture du splash animé ===== */
const appSplash = document.getElementById("appSplash");

function hideAppSplash() {
  if (!appSplash || appSplash.classList.contains("is-hidden")) return;

  appSplash.classList.add("is-hidden");

  window.setTimeout(() => {
    appSplash.remove();
  }, 500);
}

window.addEventListener("load", () => {
  window.setTimeout(hideAppSplash, 1500);
});

window.setTimeout(hideAppSplash, 2600);

/* ===== AV€NIR V10.5 : graphique animé et interactif ===== */
const openStatsButton = document.getElementById("openStatsButton");
const closeStatsButton = document.getElementById("closeStatsButton");
const statsOverlay = document.getElementById("statsOverlay");
const assetDonutCanvas = document.getElementById("assetDonutCanvas");
const donutTotal = document.getElementById("donutTotal");
const donutLegend = document.getElementById("donutLegend");

const DONUT_COLORS = [
  "#ff4b0b",
  "#ff6425",
  "#ff7b46",
  "#ff9567",
  "#ffb184",
  "#e94309",
  "#c93a08",
  "#a82f06",
  "#842404"
];

let donutAnimationFrame = null;
let donutSelectedIndex = -1;
let donutCurrentItems = [];
let donutCurrentTotal = 0;

function getDonutItems() {
  const items = accounts
    .map(account => ({
      name: account.name,
      amount: parseAmount(account.amount)
    }))
    .filter(account => account.amount > 0);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { items, total };
}

function drawAssetDonut(items, total, progress = 1) {
  if (!assetDonutCanvas) return;

  const context = assetDonutCanvas.getContext("2d");
  const size = assetDonutCanvas.width;
  const center = size / 2;
  const outerRadius = size * 0.40;
  const innerRadius = size * 0.215;
  const gap = Math.PI / 180 * 1.15;

  context.clearRect(0, 0, size, size);

  if (total <= 0 || items.length === 0) {
    context.beginPath();
    context.arc(center, center, outerRadius, 0, Math.PI * 2);
    context.arc(center, center, innerRadius, 0, Math.PI * 2, true);
    context.fillStyle = "#eeeeee";
    context.fill();
    return;
  }

  const visibleAngle = Math.PI * 2 * Math.max(0, Math.min(1, progress));
  let startAngle = -Math.PI / 2;
  let remainingAngle = visibleAngle;

  items.forEach((item, index) => {
    if (remainingAngle <= 0) return;

    const fullAngle = (item.amount / total) * Math.PI * 2;
    const drawnAngle = Math.min(fullAngle, remainingAngle);

    if (drawnAngle > gap) {
      const segmentStart = startAngle + gap / 2;
      const segmentEnd = startAngle + drawnAngle - gap / 2;
      const middleAngle = (segmentStart + segmentEnd) / 2;
      const selected = index === donutSelectedIndex;
      const offset = selected ? size * 0.055 : 0;
      const offsetX = Math.cos(middleAngle) * offset;
      const offsetY = Math.sin(middleAngle) * offset;

      context.save();
      context.translate(offsetX, offsetY);

      if (donutSelectedIndex >= 0 && !selected) {
        context.globalAlpha = 0.38;
      }

      context.beginPath();
      context.arc(center, center, outerRadius, segmentStart, segmentEnd);
      context.arc(center, center, innerRadius, segmentEnd, segmentStart, true);
      context.closePath();

      const gradient = context.createRadialGradient(
        center - outerRadius * 0.25,
        center - outerRadius * 0.3,
        innerRadius,
        center,
        center,
        outerRadius
      );

      gradient.addColorStop(0, DONUT_COLORS[index % DONUT_COLORS.length]);
      gradient.addColorStop(1, DONUT_COLORS[(index + 1) % DONUT_COLORS.length]);

      context.fillStyle = gradient;
      context.shadowColor = selected ? "rgba(255,75,11,.38)" : "transparent";
      context.shadowBlur = selected ? size * 0.045 : 0;
      context.fill();

      if (selected) {
        context.globalAlpha = 1;
        context.lineWidth = size * 0.008;
        context.strokeStyle = "rgba(255,255,255,.98)";
        context.stroke();
      }

      context.restore();
    }

    startAngle += fullAngle;
    remainingAngle -= fullAngle;
  });
}

function updateDonutCenter() {
  const centerCopy = document.querySelector(".donut-center-copy");
  if (!centerCopy || !donutTotal) return;

  const label = centerCopy.querySelector("span");
  const share = centerCopy.querySelector("small");

  if (donutSelectedIndex < 0) {
    if (label) label.textContent = "TOTAL";
    donutTotal.textContent = `${formatAmount(donutCurrentTotal)} €`;
    if (share) share.textContent = "100 %";
    return;
  }

  const item = donutCurrentItems[donutSelectedIndex];
  if (!item) return;

  const percentage = donutCurrentTotal > 0
    ? (item.amount / donutCurrentTotal) * 100
    : 0;

  if (label) label.textContent = item.name;
  donutTotal.textContent = `${formatAmount(item.amount)} €`;
  if (share) share.textContent = `${percentage.toFixed(1)} %`;
}

function updateDonutLegendSelection() {
  donutLegend?.querySelectorAll(".donut-legend-row").forEach((row, index) => {
    row.classList.toggle("is-selected", index === donutSelectedIndex);
    row.classList.toggle(
      "is-muted",
      donutSelectedIndex >= 0 && index !== donutSelectedIndex
    );
  });
}

function selectDonutSegment(index) {
  donutSelectedIndex = donutSelectedIndex === index ? -1 : index;
  drawAssetDonut(donutCurrentItems, donutCurrentTotal, 1);
  updateDonutCenter();
  updateDonutLegendSelection();
}

function buildDonutLegend(items, total) {
  if (!donutLegend) return;

  donutLegend.innerHTML = "";

  items.forEach((item, index) => {
    const percentage = total > 0 ? (item.amount / total) * 100 : 0;

    const row = document.createElement("div");
    row.className = "donut-legend-row";
    row.dataset.donutIndex = String(index);
    row.style.setProperty("--legend-delay", `${760 + index * 70}ms`);
    row.addEventListener("click", () => selectDonutSegment(index));

    const dot = document.createElement("span");
    dot.className = "donut-dot";
    dot.style.background = DONUT_COLORS[index % DONUT_COLORS.length];

    const label = document.createElement("span");
    label.className = "donut-label";
    label.textContent = item.name;

    const value = document.createElement("span");
    value.className = "donut-value";

    const amount = document.createElement("strong");
    amount.textContent = `${formatAmount(item.amount)} €`;

    const share = document.createElement("small");
    share.textContent = `${percentage.toFixed(1)} %`;

    value.append(amount, share);
    row.append(dot, label, value);
    donutLegend.appendChild(row);
  });
}

function getTouchedDonutIndex(event) {
  if (!assetDonutCanvas || donutCurrentTotal <= 0) return -1;

  const rect = assetDonutCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (assetDonutCanvas.width / rect.width);
  const y = (event.clientY - rect.top) * (assetDonutCanvas.height / rect.height);

  const center = assetDonutCanvas.width / 2;
  const dx = x - center;
  const dy = y - center;
  const distance = Math.hypot(dx, dy);
  const outerRadius = assetDonutCanvas.width * 0.47;
  const innerRadius = assetDonutCanvas.width * 0.17;

  if (distance < innerRadius || distance > outerRadius) return -1;

  let angle = Math.atan2(dy, dx) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;

  let cursor = 0;

  for (let index = 0; index < donutCurrentItems.length; index += 1) {
    const segmentAngle =
      (donutCurrentItems[index].amount / donutCurrentTotal) * Math.PI * 2;

    if (angle >= cursor && angle < cursor + segmentAngle) {
      return index;
    }

    cursor += segmentAngle;
  }

  return -1;
}

function animateDonutOpening(items, total) {
  if (donutAnimationFrame) {
    cancelAnimationFrame(donutAnimationFrame);
  }

  const duration = 520;
  let startedAt = null;

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function frame(timestamp) {
    if (startedAt === null) startedAt = timestamp;

    const rawProgress = Math.min((timestamp - startedAt) / duration, 1);
    const easedProgress = easeOutCubic(rawProgress);

    drawAssetDonut(items, total, easedProgress);

    if (rawProgress < 1) {
      donutAnimationFrame = requestAnimationFrame(frame);
    } else {
      donutAnimationFrame = null;
    }
  }

  donutAnimationFrame = requestAnimationFrame(frame);
}

function renderAssetDonut({ animate = false } = {}) {
  if (!donutLegend || !donutTotal) return;

  const { items, total } = getDonutItems();
  donutCurrentItems = items;
  donutCurrentTotal = total;
  donutSelectedIndex = -1;

  donutTotal.textContent = `${formatAmount(total)} €`;
  buildDonutLegend(items, total);
  updateDonutCenter();
  updateDonutLegendSelection();

  if (animate) {
    drawAssetDonut(items, total, 0);
    requestAnimationFrame(() => animateDonutOpening(items, total));
  } else {
    drawAssetDonut(items, total, 1);
  }
}

function openStats() {
  statsOverlay.hidden = false;
  document.body.classList.add("stats-open");

  const statsPanel = statsOverlay.querySelector(".stats-panel");
  const centerCopy = statsOverlay.querySelector(".donut-center-copy");

  statsPanel?.classList.remove("is-opening");
  centerCopy?.classList.remove("is-sequence-visible");
  void statsPanel?.offsetWidth;

  statsPanel?.classList.add("is-opening");
  renderAssetDonut({ animate: true });

  window.setTimeout(() => {
    centerCopy?.classList.add("is-sequence-visible");
  }, 610);
}

function closeStats() {
  if (donutAnimationFrame) {
    cancelAnimationFrame(donutAnimationFrame);
    donutAnimationFrame = null;
  }

  statsOverlay.hidden = true;
  document.body.classList.remove("stats-open");
}

assetDonutCanvas?.addEventListener("pointerup", event => {
  const index = getTouchedDonutIndex(event);

  if (index >= 0) {
    selectDonutSegment(index);
  } else {
    donutSelectedIndex = -1;
    drawAssetDonut(donutCurrentItems, donutCurrentTotal, 1);
    updateDonutCenter();
    updateDonutLegendSelection();
  }
});

openStatsButton?.addEventListener("click", openStats);
closeStatsButton?.addEventListener("click", closeStats);

statsOverlay?.addEventListener("click", event => {
  if (event.target === statsOverlay) {
    closeStats();
  }
});

