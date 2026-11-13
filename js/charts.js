// Pure, dependency-free interactive SVG Charts for Zakat Analytics

export function formatMoney(amount, symbol, lang = 'ar') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  return `${formatted} ${symbol}`;
}

export function renderNisabGauge(container, wealth, nisab, symbol, lang) {
  if (!container) return;
  const ratio = nisab > 0 ? Math.min(wealth / nisab, 1.5) : 0;
  const pct = nisab > 0 ? Math.round((wealth / nisab) * 100) : 0;
  const clampedRatio = Math.min(ratio, 1);

  const radius = 84;
  const circumference = Math.PI * radius; // Semi-circle
  const dashOffset = circumference * (1 - clampedRatio);
  const isAbove = wealth >= nisab && nisab > 0;
  const strokeColor = isAbove ? '#10b981' : '#f59e0b';

  const statusText = isAbove
    ? (lang === 'ar' ? 'بلغت النصاب' : 'Nisab Reached')
    : (lang === 'ar' ? 'أقل من النصاب' : 'Below Nisab');

  container.innerHTML = `
    <div class="gauge-wrap">
      <svg viewBox="0 0 220 135" class="gauge-svg" aria-label="Nisab Gauge">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${isAbove ? '#059669' : '#d97706'}" />
            <stop offset="100%" stop-color="${isAbove ? '#34d399' : '#fbbf24'}" />
          </linearGradient>
        </defs>
        <!-- Background Track -->
        <path d="M 26 110 A 84 84 0 0 1 194 110"
              fill="none" stroke="var(--border-color)" stroke-width="16" stroke-linecap="round" />
        <!-- Active Progress -->
        <path d="M 26 110 A 84 84 0 0 1 194 110"
              fill="none" stroke="url(#gaugeGrad)" stroke-width="16" stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${dashOffset}"
              style="transition: stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1);" />
        <text x="110" y="84" text-anchor="middle" class="gauge-pct" fill="var(--text-primary)">${pct}%</text>
        <text x="110" y="106" text-anchor="middle" class="gauge-status" fill="${strokeColor}">${statusText}</text>
      </svg>
      <div class="gauge-metrics">
        <div>
          <span class="gm-label">${lang === 'ar' ? 'الأصول الزكوية:' : 'Zakatable Wealth:'}</span>
          <strong>${formatMoney(wealth, symbol, lang)}</strong>
        </div>
        <div>
          <span class="gm-label">${lang === 'ar' ? 'حد النصاب:' : 'Nisab Threshold:'}</span>
          <strong>${formatMoney(nisab, symbol, lang)}</strong>
        </div>
      </div>
    </div>
  `;
}

export function renderDonutChart(container, items, totalZakat, symbol, lang) {
  if (!container) return;
  const activeItems = items.filter((i) => i.zakat > 0);

  if (activeItems.length === 0 || totalZakat <= 0) {
    container.innerHTML = `<div class="chart-empty">${lang === 'ar' ? 'أدخل قيماً في البطاقات لعرض توزيع الزكاة بيانياً' : 'Enter values in cards to display Zakat breakdown'}</div>`;
    return;
  }

  const size = 200;
  const cx = 100;
  const cy = 100;
  const r = 72;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const slices = activeItems.map((item) => {
    const fraction = item.zakat / totalZakat;
    const dash = fraction * circumference;
    const slice = `
      <circle
        cx="${cx}" cy="${cy}" r="${r}"
        fill="transparent"
        stroke="${item.color}"
        stroke-width="26"
        stroke-dasharray="${dash} ${circumference - dash}"
        stroke-dashoffset="${-offset}"
        class="donut-slice"
      >
        <title>${item.label}: ${formatMoney(item.zakat, symbol, lang)} (${Math.round(fraction * 100)}%)</title>
      </circle>
    `;
    offset += dash;
    return slice;
  }).join('');

  const legend = activeItems.map((item) => {
    const pct = Math.round((item.zakat / totalZakat) * 100);
    return `
      <div class="legend-item">
        <span class="legend-dot" style="background:${item.color}"></span>
        <span class="legend-name">${item.label}</span>
        <span class="legend-val">${pct}% (${formatMoney(item.zakat, symbol, lang)})</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="donut-layout">
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 ${size} ${size}" class="donut-svg">
          <g transform="rotate(-90 ${cx} ${cy})">
            ${slices}
          </g>
        </svg>
        <div class="donut-center">
          <span class="dc-label">${lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
          <strong class="dc-val">${formatMoney(totalZakat, symbol, lang)}</strong>
        </div>
      </div>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

export function renderBarComparisonChart(container, items, symbol, lang) {
  if (!container) return;
  const activeItems = items.filter((i) => i.wealth > 0 || i.zakat > 0);

  if (activeItems.length === 0) {
    container.innerHTML = `<div class="chart-empty">${lang === 'ar' ? 'لا توجد أصول مدخلة للمقارنة بعد' : 'No assets entered yet for comparison'}</div>`;
    return;
  }

  const maxVal = Math.max(...activeItems.map((i) => Math.max(i.wealth, i.zakat)), 1);

  const rows = activeItems.map((item) => {
    const wPct = Math.max((item.wealth / maxVal) * 100, 2);
    const zPct = Math.max((item.zakat / maxVal) * 100, item.zakat > 0 ? 2 : 0);
    return `
      <div class="bar-row">
        <div class="bar-row-head">
          <span><i class="bar-dot" style="background:${item.color}"></i>${item.label}</span>
          <span class="bar-nums">${formatMoney(item.zakat, symbol, lang)}</span>
        </div>
        <div class="bar-track" title="${lang === 'ar' ? 'الأصل:' : 'Asset:'} ${formatMoney(item.wealth, symbol, lang)}">
          <div class="bar-fill-wealth" style="width:${wPct}%; background:${item.color}33; border-inline-start: 3px solid ${item.color};"></div>
          <div class="bar-fill-zakat" style="width:${zPct}%; background:${item.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="bar-chart-wrap">
      <div class="bar-legend-top">
        <span><i class="swatch-light"></i> ${lang === 'ar' ? 'إجمالي الأصل' : 'Asset Base'}</span>
        <span><i class="swatch-solid"></i> ${lang === 'ar' ? 'الزكاة المستحقة' : 'Zakat Due'}</span>
      </div>
      ${rows}
    </div>
  `;
}
