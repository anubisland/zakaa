import {
  CURRENCIES,
  NISAB_CONSTANTS,
  CATEGORY_COLORS,
  calculateLivestockZakat,
  MASARIF_DATA,
  applyLiveRatesFromEGP
} from './fiqh-data.js';
import { TRANSLATIONS } from './i18n.js';
import {
  formatMoney,
  renderNisabGauge,
  renderDonutChart,
  renderBarComparisonChart
} from './charts.js';

const STORAGE_KEY = 'anubisland_zakaa_state_v1';
const FX_CACHE_KEY = 'anubisland_zakaa_fx_v1';

let fxStatus = { mode: 'loading', updatedAt: null };

let state = {
  lang: 'ar',
  theme: 'light',
  fontFamily: "'Cairo', sans-serif",
  fontSize: '16px',
  currency: 'EGP',
  nisabMethod: 'gold',
  goldPriceEGP: NISAB_CONSTANTS.DEFAULT_GOLD_24K_EGP,
  silverPriceEGP: NISAB_CONSTANTS.DEFAULT_SILVER_EGP,
  multiCurrencies: []
};

const el = (id) => document.getElementById(id);
const num = (id) => Math.max(0, parseFloat(el(id)?.value) || 0);

function getCurrency() {
  return CURRENCIES[state.currency] || CURRENCIES.EGP;
}

function initCurrencySelect() {
  const select = el('currencySelect');
  select.innerHTML = Object.values(CURRENCIES).map((c) => {
    const name = state.lang === 'ar' ? c.nameAr : c.nameEn;
    return `<option value="${c.code}">${c.code} — ${name} (${c.symbol})</option>`;
  }).join('');
  select.value = state.currency;
}

function syncMetalInputsToCurrency() {
  const cur = getCurrency();
  el('goldPriceInput').value = (state.goldPriceEGP * cur.rateFromEGP).toFixed(2);
  el('silverPriceInput').value = (state.silverPriceEGP * cur.rateFromEGP).toFixed(2);
}

function renderMasarif() {
  const grid = el('masarifGrid');
  grid.innerHTML = MASARIF_DATA.map((m) => `
    <div class="masraf-card" style="--masraf-color: ${m.color};">
      <div class="masraf-head">
        <span class="masraf-icon">${m.icon}</span>
        <h4>${state.lang === 'ar' ? m.titleAr : m.titleEn}</h4>
      </div>
      <p>${state.lang === 'ar' ? m.descAr : m.descEn}</p>
    </div>
  `).join('');
}

function applyLanguage() {
  const t = TRANSLATIONS[state.lang];
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.title = state.lang === 'ar' ? 'حاسبة الزكاة | Anubisland' : 'Zakat Calculator | Anubisland';
  el('btnLang').textContent = state.lang === 'ar' ? '🌐 EN' : '🌐 عربي';
  el('txtAppTitle').textContent = t.appTitle;
  el('txtBrandSub').textContent = t.brandSub;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (t[key]) node.textContent = t[key];
  });

  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    const key = node.getAttribute('data-i18n-html');
    if (t[key]) node.innerHTML = t[key];
  });

  initCurrencySelect();
  renderMultiCurrencyRows();
  renderMasarif();
  updateFxBadge();
  recalculate();
}

function updateFxBadge() {
  const badge = el('fxStatusBadge');
  if (!badge) return;
  const t = TRANSLATIONS[state.lang];
  if (fxStatus.mode === 'loading') {
    badge.textContent = `⏳ ${t.fxLoading}`;
  } else if (fxStatus.mode === 'live') {
    const timeStr = fxStatus.updatedAt
      ? new Date(fxStatus.updatedAt).toLocaleTimeString(state.lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    badge.textContent = `🟢 ${t.fxLive}${timeStr ? ` (${timeStr})` : ''}`;
  } else {
    badge.textContent = `🟡 ${t.fxCached}`;
  }
}

async function fetchLiveExchangeRates() {
  fxStatus.mode = 'loading';
  updateFxBadge();

  const loadCached = () => {
    try {
      const raw = localStorage.getItem(FX_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.rates) {
          applyLiveRatesFromEGP(parsed.rates);
          fxStatus = { mode: 'cached', updatedAt: parsed.updatedAt || null };
          return true;
        }
      }
    } catch (_) {}
    fxStatus = { mode: 'cached', updatedAt: null };
    return false;
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    loadCached();
    updateFxBadge();
    syncMetalInputsToCurrency();
    recalculate();
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    let rates = null;
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/EGP', { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) rates = data.rates;
      }
    } catch (_) {}

    if (!rates) {
      const res2 = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/egp.json', { signal: controller.signal });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2?.egp) rates = data2.egp;
      }
    }

    if (rates && applyLiveRatesFromEGP(rates)) {
      const now = Date.now();
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ rates, updatedAt: now }));
      fxStatus = { mode: 'live', updatedAt: now };
    } else {
      loadCached();
    }
  } catch (_) {
    loadCached();
  } finally {
    clearTimeout(timer);
    updateFxBadge();
    syncMetalInputsToCurrency();
    recalculate();
  }
}

function renderMultiCurrencyRows() {
  const container = el('multiCurrencyRows');
  if (!container) return;
  container.innerHTML = state.multiCurrencies.map((entry, idx) => {
    const options = Object.values(CURRENCIES).map((c) => {
      const label = `${c.code} (${c.symbol})`;
      return `<option value="${c.code}" ${c.code === entry.code ? 'selected' : ''}>${label}</option>`;
    }).join('');
    return `
      <div class="mc-row" data-mc-idx="${idx}">
        <select class="mc-code">${options}</select>
        <input type="number" class="mc-amount" min="0" step="any" placeholder="0" value="${entry.amount}" />
        <button type="button" class="btn-remove-mc" title="Remove">×</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.mc-row').forEach((row) => {
    const idx = parseInt(row.getAttribute('data-mc-idx'), 10);
    row.querySelector('.mc-code').addEventListener('change', (e) => {
      state.multiCurrencies[idx].code = e.target.value;
      recalculate();
    });
    row.querySelector('.mc-amount').addEventListener('input', (e) => {
      state.multiCurrencies[idx].amount = e.target.value;
      recalculate();
    });
    row.querySelector('.btn-remove-mc').addEventListener('click', () => {
      state.multiCurrencies.splice(idx, 1);
      renderMultiCurrencyRows();
      recalculate();
    });
  });
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  el('btnTheme').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

function applyTypography() {
  document.documentElement.style.setProperty('--app-font', state.fontFamily);
  document.documentElement.style.setProperty('--base-font-size', state.fontSize);
  if (el('fontSelect')) el('fontSelect').value = state.fontFamily;
  if (el('fontSizeSelect')) el('fontSizeSelect').value = state.fontSize;
}

function recalculate() {
  const cur = getCurrency();
  const sym = cur.symbol;
  const lang = state.lang;
  const t = TRANSLATIONS[lang];

  const goldPrice = Math.max(0, parseFloat(el('goldPriceInput').value) || 0);
  const silverPrice = Math.max(0, parseFloat(el('silverPriceInput').value) || 0);

  const nisabGold = NISAB_CONSTANTS.GOLD_GRAMS_24K * goldPrice;
  const nisabSilver = NISAB_CONSTANTS.SILVER_GRAMS * silverPrice;
  const activeNisab = state.nisabMethod === 'silver' ? nisabSilver : nisabGold;

  // 1. Cash (Main Currency + Multi-Currency Wallet converted via live FX rates)
  const cashMainRaw = num('cashOnHand') + num('cashBank');
  const cashDebtsDue = num('cashDebtsDue');
  let multiConvertedToDisplay = 0;
  state.multiCurrencies.forEach((entry) => {
    const amt = Math.max(0, parseFloat(entry.amount) || 0);
    if (amt > 0) {
      const entryCur = CURRENCIES[entry.code] || CURRENCIES.EGP;
      const inEGP = amt / entryCur.rateFromEGP;
      multiConvertedToDisplay += inEGP * cur.rateFromEGP;
    }
  });
  const cashNet = Math.max(0, cashMainRaw + multiConvertedToDisplay - cashDebtsDue);
  const cashHawlOk = el('cashHawl').value === 'yes';
  const cashBase = cashHawlOk ? cashNet : 0;

  // 2. Gold & Silver
  const goldKarat = parseFloat(el('goldKarat').value) || 24;
  const pureGoldGrams = num('goldGrams') * (goldKarat / 24);
  const goldPurpose = el('goldPurpose').value;
  const goldInclude = goldPurpose !== 'worn_jumhur';
  const goldVal = goldInclude ? pureGoldGrams * goldPrice : 0;
  const silverVal = num('silverGrams') * silverPrice;
  const metalsBase = goldVal + silverVal;

  // 3. Stocks
  const stocksType = el('stocksType').value;
  const stocksMarket = num('stocksMarketVal');
  const stocksDiv = num('stocksDividends');
  const stocksBase = stocksType === 'trading' ? stocksMarket : stocksDiv;

  // 4. Trade
  const tradeBase = Math.max(0, num('tradeInventory') + num('tradeCash') - num('tradeLiabilities'));

  // 7. Real Estate
  const reType = el('realEstateType').value;
  const reVal = num('realEstateVal');
  const reBase = reType === 'personal' ? 0 : reVal;

  // 8. Debts owed to you
  const debtStatus = el('debtStatus').value;
  const debtVal = num('debtOwedVal');
  const debtBase = debtStatus === 'collectible' ? debtVal : 0;

  // Combine Hawl-based monetary wealth to check against Nisab together (ضم الأموال لبعضها في النصاب)
  const hawlWealthTotal = cashBase + metalsBase + stocksBase + tradeBase + reBase + debtBase;
  const meetsNisab = hawlWealthTotal >= activeNisab && activeNisab > 0;

  const cashZakat = meetsNisab ? cashBase * 0.025 : 0;
  const metalsZakat = meetsNisab ? metalsBase * 0.025 : 0;
  const stocksZakat = meetsNisab ? stocksBase * 0.025 : 0;
  const tradeZakat = meetsNisab ? tradeBase * 0.025 : 0;
  const reZakat = meetsNisab ? reBase * 0.025 : 0;
  const debtZakat = meetsNisab ? debtBase * 0.025 : 0;

  // 5. Crops (Independent Nisab: 653 kg, no Hawl)
  const cropsKg = num('cropsKg');
  const cropsValue = num('cropsValue');
  const cropsRate = parseFloat(el('cropsIrrigation').value) || 0.10;
  const cropsMeetsNisab = cropsKg >= NISAB_CONSTANTS.CROPS_KG || (cropsKg === 0 && cropsValue > 0 && false);
  const cropsZakat = cropsKg >= NISAB_CONSTANTS.CROPS_KG ? cropsValue * cropsRate : 0;

  // 6. Livestock
  const lsType = el('livestockType').value;
  const lsCount = num('livestockCount');
  const lsGrazing = el('livestockGrazing').value;
  let lsText = lang === 'ar' ? 'لا زكاة' : 'No Zakat';
  if (lsGrazing === 'yes' && lsCount > 0) {
    const res = calculateLivestockZakat(lsType, lsCount);
    lsText = lang === 'ar' ? res.dueTextAr : res.dueTextEn;
  } else if (lsGrazing === 'trade' && lsCount > 0) {
    lsText = lang === 'ar' ? 'تُحسب قيمتها ضمن عروض التجارة (2.5%)' : 'Calculated under Trade Inventory (2.5%)';
  } else if (lsGrazing === 'no' && lsCount > 0) {
    lsText = lang === 'ar' ? 'المعلوفة لا زكاة فيها ما لم تكن للتجارة' : 'Stall-fed livestock is exempt unless for trade';
  }

  // 9. Rikaz & Minerals (Immediate, no Nisab for Rikaz)
  const rikazRate = parseFloat(el('rikazType').value) || 0.20;
  const rikazVal = num('rikazVal');
  const rikazZakat = rikazVal * rikazRate;

  // 10. Zakat al-Fitr
  const fitrMembers = num('fitrMembers');
  const fitrPerPerson = num('fitrPerPerson');
  const fitrZakat = fitrMembers * fitrPerPerson;

  // Update Card Outputs
  el('resCash').textContent = formatMoney(cashZakat, sym, lang);

  // Per-currency breakdown display for Cash
  const perCurBox = el('cashPerCurrencyBox');
  const cashOutputMode = el('cashOutputMode')?.value || 'unified';
  if (perCurBox) {
    const hasMulti = state.multiCurrencies.some((e) => (parseFloat(e.amount) || 0) > 0);
    if (cashOutputMode === 'per_currency' && meetsNisab && cashHawlOk && (cashMainRaw > 0 || hasMulti)) {
      const lines = [];
      const mainNet = Math.max(0, cashMainRaw - cashDebtsDue);
      if (mainNet > 0) {
        lines.push(`<div class="pcb-item"><span>${cur.code} (${cur.symbol})</span><span>${formatMoney(mainNet * 0.025, sym, lang)}</span></div>`);
      }
      state.multiCurrencies.forEach((entry) => {
        const amt = Math.max(0, parseFloat(entry.amount) || 0);
        if (amt > 0) {
          const cObj = CURRENCIES[entry.code] || CURRENCIES.EGP;
          lines.push(`<div class="pcb-item"><span>${cObj.code} (${cObj.symbol})</span><span>${formatMoney(amt * 0.025, cObj.symbol, lang)}</span></div>`);
        }
      });
      perCurBox.innerHTML = `<div class="pcb-title">${t.mcBreakdownTitle}</div>${lines.join('')}`;
      perCurBox.classList.remove('hidden');
    } else {
      perCurBox.classList.add('hidden');
      perCurBox.innerHTML = '';
    }
  }
  el('resGold').textContent = formatMoney(metalsZakat, sym, lang);
  el('resStocks').textContent = formatMoney(stocksZakat, sym, lang);
  el('resTrade').textContent = formatMoney(tradeZakat, sym, lang);
  el('resCrops').textContent = formatMoney(cropsZakat, sym, lang);
  el('resLivestock').textContent = lsText;
  el('resRealEstate').textContent = formatMoney(reZakat, sym, lang);
  el('resDebts').textContent = formatMoney(debtZakat, sym, lang);
  el('resRikaz').textContent = formatMoney(rikazZakat, sym, lang);
  el('resFitr').textContent = formatMoney(fitrZakat, sym, lang);

  // Totals
  const totalMonetaryZakat =
    cashZakat + metalsZakat + stocksZakat + tradeZakat +
    cropsZakat + reZakat + debtZakat + rikazZakat + fitrZakat;

  const totalAssets = hawlWealthTotal + cropsValue + rikazVal;

  el('kpiNisabValue').textContent = formatMoney(activeNisab, sym, lang);
  el('kpiNisabSub').textContent = state.nisabMethod === 'silver'
    ? (lang === 'ar' ? '595 جرام فضة' : '595g Pure Silver')
    : (lang === 'ar' ? '85 جرام ذهب عيار 24' : '85g 24K Gold');

  el('kpiTotalWealth').textContent = formatMoney(totalAssets, sym, lang);
  const statusEl = el('kpiNisabStatus');
  if (meetsNisab) {
    statusEl.textContent = t.nisabStatusAbove;
    statusEl.className = 'kpi-sub above';
  } else {
    statusEl.textContent = t.nisabStatusBelow;
    statusEl.className = 'kpi-sub below';
  }

  el('kpiTotalZakat').textContent = formatMoney(totalMonetaryZakat, sym, lang);
  el('mobileTotalZakat').textContent = formatMoney(totalMonetaryZakat, sym, lang);
  el('kpiExtraInKind').textContent = (lsGrazing === 'yes' && lsCount > 0)
    ? `+ ${lsText}`
    : (lang === 'ar' ? 'شاملة كافة البنود المستحقة' : 'Includes all eligible categories');

  // Smart Advisor Tips
  const tips = [];
  if (hawlWealthTotal > 0 && !meetsNisab) {
    tips.push(lang === 'ar'
      ? `أموالك الحولية (${formatMoney(hawlWealthTotal, sym, lang)}) لم تبلغ حد النصاب (${formatMoney(activeNisab, sym, lang)})، لذا لا تجب فيها زكاة الحول.`
      : `Your annual wealth (${formatMoney(hawlWealthTotal, sym, lang)}) is below Nisab (${formatMoney(activeNisab, sym, lang)}), so annual Zakat is not obligatory.`);
  }
  if (cropsKg > 0 && cropsKg < NISAB_CONSTANTS.CROPS_KG) {
    tips.push(lang === 'ar'
      ? `وزن المحصول (${cropsKg} كجم) أقل من نصاب الزروع الشرعي (653 كجم / 5 أوسق)، فلا زكاة فيه.`
      : `Crop weight (${cropsKg} kg) is below the 653 kg Nisab, so no crop Zakat is due.`);
  }
  if (!cashHawlOk && cashNet > 0) {
    tips.push(lang === 'ar'
      ? 'زكاة النقد والمدخرات لا تجب حتى يمر عليها عام هجري كامل (حولان الحول).'
      : 'Cash Zakat requires completing one full lunar year (Hawl).');
  }
  if (goldPurpose === 'worn_jumhur' && num('goldGrams') > 0) {
    tips.push(lang === 'ar'
      ? 'تم استثناء الحلي الملبوس المعتاد وفق مذهب الجمهور (المالكية والشافعية والحنابلة)، ويمكنك اختيار مذهب الحنفية للاحتياط.'
      : 'Worn jewelry is excluded per the majority Sunni view; select the Hanafi option if you prefer precaution.');
  }
  if (tips.length === 0) {
    tips.push(lang === 'ar'
      ? 'يتم ضم أموالك النقدية والذهب والتجارة والأسهم معاً في حساب النصاب الشرعي تلقائياً وفق منهج أهل السنة والجماعة.'
      : 'Cash, gold, trade inventory, and stocks are automatically combined to evaluate your Nisab threshold.');
  }
  el('advisorList').innerHTML = tips.map((tip) => `<li>• ${tip}</li>`).join('');

  // Render Charts
  const chartItems = [
    { label: lang === 'ar' ? 'النقد والمدخرات' : 'Cash', wealth: cashBase, zakat: cashZakat, color: CATEGORY_COLORS.cash },
    { label: lang === 'ar' ? 'الذهب والفضة' : 'Gold & Silver', wealth: metalsBase, zakat: metalsZakat, color: CATEGORY_COLORS.gold },
    { label: lang === 'ar' ? 'الأسهم' : 'Stocks', wealth: stocksBase, zakat: stocksZakat, color: CATEGORY_COLORS.stocks },
    { label: lang === 'ar' ? 'عروض التجارة' : 'Trade', wealth: tradeBase, zakat: tradeZakat, color: CATEGORY_COLORS.trade },
    { label: lang === 'ar' ? 'الزروع' : 'Crops', wealth: cropsValue, zakat: cropsZakat, color: CATEGORY_COLORS.crops },
    { label: lang === 'ar' ? 'العقارات' : 'Real Estate', wealth: reBase, zakat: reZakat, color: CATEGORY_COLORS.realestate },
    { label: lang === 'ar' ? 'الديون المرجوة' : 'Debts', wealth: debtBase, zakat: debtZakat, color: CATEGORY_COLORS.debts },
    { label: lang === 'ar' ? 'الركاز' : 'Rikaz', wealth: rikazVal, zakat: rikazZakat, color: CATEGORY_COLORS.rikaz },
    { label: lang === 'ar' ? 'زكاة الفطر' : 'Fitr', wealth: fitrZakat, zakat: fitrZakat, color: CATEGORY_COLORS.fitr }
  ];

  renderNisabGauge(el('chartNisabGauge'), hawlWealthTotal, activeNisab, sym, lang);
  renderDonutChart(el('chartDonut'), chartItems, totalMonetaryZakat, sym, lang);
  renderBarComparisonChart(el('chartBar'), chartItems, sym, lang);

  saveState();
}

function saveState() {
  const inputs = {};
  document.querySelectorAll('[data-calc]').forEach((node) => {
    inputs[node.id] = node.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, inputs }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.state) state = { ...state, ...parsed.state };
    if (parsed.inputs) {
      Object.entries(parsed.inputs).forEach(([id, val]) => {
        const node = el(id);
        if (node) node.value = val;
      });
    }
  } catch (_) {}
}

// PWA Install Prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  el('btnInstallPWA').classList.remove('hidden');
});

el('btnInstallPWA').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  el('btnInstallPWA').classList.add('hidden');
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme();
  applyTypography();
  initCurrencySelect();
  el('nisabMethod').value = state.nisabMethod;
  syncMetalInputsToCurrency();
  applyLanguage();

  el('currencySelect').addEventListener('change', (e) => {
    state.currency = e.target.value;
    syncMetalInputsToCurrency();
    recalculate();
  });

  el('nisabMethod').addEventListener('change', (e) => {
    state.nisabMethod = e.target.value;
    recalculate();
  });

  el('goldPriceInput').addEventListener('input', () => {
    const cur = getCurrency();
    state.goldPriceEGP = (parseFloat(el('goldPriceInput').value) || 0) / cur.rateFromEGP;
    recalculate();
  });

  el('silverPriceInput').addEventListener('input', () => {
    const cur = getCurrency();
    state.silverPriceEGP = (parseFloat(el('silverPriceInput').value) || 0) / cur.rateFromEGP;
    recalculate();
  });

  document.querySelectorAll('[data-calc]').forEach((node) => {
    node.addEventListener('input', recalculate);
    node.addEventListener('change', recalculate);
  });

  el('btnLang').addEventListener('click', () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    applyLanguage();
  });

  el('btnTheme').addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
  });

  el('fontSelect').addEventListener('change', (e) => {
    state.fontFamily = e.target.value;
    applyTypography();
    saveState();
  });

  el('fontSizeSelect').addEventListener('change', (e) => {
    state.fontSize = e.target.value;
    applyTypography();
    saveState();
  });

  el('btnPrint').addEventListener('click', () => window.print());

  el('btnReset').addEventListener('click', () => {
    document.querySelectorAll('input[data-calc]').forEach((inp) => {
      inp.value = inp.id === 'fitrPerPerson' ? '35' : '';
    });
    state.multiCurrencies = [];
    renderMultiCurrencyRows();
    recalculate();
  });

  el('btnAddCurrency')?.addEventListener('click', () => {
    const fallbackCodes = ['USD', 'SAR', 'AED', 'EUR', 'GBP', 'KWD', 'EGP'];
    const nextCode = fallbackCodes.find((c) => c !== state.currency && !state.multiCurrencies.some((m) => m.code === c)) || 'USD';
    state.multiCurrencies.push({ code: nextCode, amount: '' });
    renderMultiCurrencyRows();
    saveState();
  });

  el('btnRefreshFx')?.addEventListener('click', fetchLiveExchangeRates);
  window.addEventListener('online', fetchLiveExchangeRates);

  // Fetch live FX rates automatically on startup
  fetchLiveExchangeRates();

  // View / Screen Switching
  document.querySelectorAll('.nav-pill[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view');
      document.querySelectorAll('.nav-pill[data-view]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.app-view').forEach((v) => v.classList.remove('active'));
      const viewEl = el(`view-${target}`);
      if (viewEl) viewEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
