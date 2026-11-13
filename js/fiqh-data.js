// Sunni Fiqh (أهل السنة والجماعة) constants, currencies, livestock tables, and educational content

export const CURRENCIES = {
  EGP: { code: 'EGP', symbol: 'ج.م', nameAr: 'الجنيه المصري', nameEn: 'Egyptian Pound', rateFromEGP: 1 },
  SAR: { code: 'SAR', symbol: 'ر.س', nameAr: 'الريال السعودي', nameEn: 'Saudi Riyal', rateFromEGP: 0.076 },
  AED: { code: 'AED', symbol: 'د.إ', nameAr: 'الدرهم الإماراتي', nameEn: 'UAE Dirham', rateFromEGP: 0.074 },
  KWD: { code: 'KWD', symbol: 'د.ك', nameAr: 'الدينار الكويتي', nameEn: 'Kuwaiti Dinar', rateFromEGP: 0.0062 },
  QAR: { code: 'QAR', symbol: 'ر.ق', nameAr: 'الريال القطري', nameEn: 'Qatari Riyal', rateFromEGP: 0.074 },
  USD: { code: 'USD', symbol: '$', nameAr: 'الدولار الأمريكي', nameEn: 'US Dollar', rateFromEGP: 0.0203 },
  EUR: { code: 'EUR', symbol: '€', nameAr: 'اليورو', nameEn: 'Euro', rateFromEGP: 0.0188 },
  GBP: { code: 'GBP', symbol: '£', nameAr: 'الجنيه الإسترليني', nameEn: 'British Pound', rateFromEGP: 0.0158 }
};

export const NISAB_CONSTANTS = {
  GOLD_GRAMS_24K: 85,
  SILVER_GRAMS: 595,
  CROPS_KG: 653, // 5 Awsuq ≈ 653 kg
  DEFAULT_GOLD_24K_EGP: 4200, // Editable by user
  DEFAULT_SILVER_EGP: 55 // Editable by user
};

export const CATEGORY_COLORS = {
  cash: '#10b981',       // Emerald
  gold: '#f59e0b',       // Royal Gold
  stocks: '#3b82f6',     // Sapphire Blue
  trade: '#06b6d4',      // Teal/Cyan
  crops: '#84cc16',      // Olive/Lime Green
  livestock: '#d97706',  // Warm Amber
  realestate: '#8b5cf6', // Indigo/Purple
  debts: '#ec4899',      // Rose
  rikaz: '#b45309',      // Bronze
  fitr: '#6366f1'        // Violet
};

// Livestock Calculation according to authentic Sunni Hadith (Sahih al-Bukhari / Abu Dawud)
export function calculateLivestockZakat(type, count) {
  const n = Math.floor(Number(count) || 0);
  if (n <= 0) return { dueTextAr: 'لا زكاة', dueTextEn: 'No Zakat due', countValue: 0, detailAr: '', detailEn: '' };

  if (type === 'sheep') {
    if (n < 40) return { dueTextAr: 'لا زكاة (أقل من النصاب 40)', dueTextEn: 'Below Nisab (40)', countValue: 0 };
    if (n <= 120) return { dueTextAr: 'شاة واحدة (من الضأن أو الماعز)', dueTextEn: '1 Sheep/Goat', countValue: 1 };
    if (n <= 200) return { dueTextAr: 'شاتان', dueTextEn: '2 Sheep/Goats', countValue: 2 };
    if (n <= 399) return { dueTextAr: '3 شياه', dueTextEn: '3 Sheep/Goats', countValue: 3 };
    const hundreds = Math.floor(n / 100);
    return {
      dueTextAr: `${hundreds} شياه (في كل مائة شاة)`,
      dueTextEn: `${hundreds} Sheep/Goats (1 per 100)`,
      countValue: hundreds
    };
  }

  if (type === 'cows') {
    if (n < 30) return { dueTextAr: 'لا زكاة (أقل من النصاب 30)', dueTextEn: 'Below Nisab (30)', countValue: 0 };
    // Best combination of Tabi' (30) and Musinnah (40)
    let bestT = 0, bestM = 0, minRem = Infinity;
    for (let m = Math.floor(n / 40); m >= 0; m--) {
      const rem = n - m * 40;
      const t = Math.floor(rem / 30);
      const finalRem = rem - t * 30;
      if (finalRem < minRem) {
        minRem = finalRem;
        bestT = t;
        bestM = m;
      }
      if (finalRem === 0) break;
    }
    const partsAr = [];
    const partsEn = [];
    if (bestT > 0) {
      partsAr.push(`${bestT} تبيع أو تبيعة (أتم سنة)`);
      partsEn.push(`${bestT} Tabi' (1-yr-old calf)`);
    }
    if (bestM > 0) {
      partsAr.push(`${bestM} مسنة (أتمت سنتين)`);
      partsEn.push(`${bestM} Musinnah (2-yr-old cow)`);
    }
    return {
      dueTextAr: partsAr.join(' + '),
      dueTextEn: partsEn.join(' + '),
      countValue: bestT + bestM
    };
  }

  if (type === 'camels') {
    if (n < 5) return { dueTextAr: 'لا زكاة (أقل من النصاب 5)', dueTextEn: 'Below Nisab (5)', countValue: 0 };
    if (n <= 9) return { dueTextAr: 'شاة واحدة', dueTextEn: '1 Sheep', countValue: 1 };
    if (n <= 14) return { dueTextAr: 'شاتان', dueTextEn: '2 Sheep', countValue: 2 };
    if (n <= 19) return { dueTextAr: '3 شياه', dueTextEn: '3 Sheep', countValue: 3 };
    if (n <= 24) return { dueTextAr: '4 شياه', dueTextEn: '4 Sheep', countValue: 4 };
    if (n <= 35) return { dueTextAr: 'بنت مخاض (أتمت سنة)', dueTextEn: '1 Bint Makhad (1-yr she-camel)', countValue: 1 };
    if (n <= 45) return { dueTextAr: 'بنت لبون (أتمت سنتين)', dueTextEn: '1 Bint Labun (2-yr she-camel)', countValue: 1 };
    if (n <= 60) return { dueTextAr: 'حقة (أتمت 3 سنوات)', dueTextEn: '1 Hiqqah (3-yr she-camel)', countValue: 1 };
    if (n <= 75) return { dueTextAr: 'جذعة (أتمت 4 سنوات)', dueTextEn: '1 Jadha\'ah (4-yr she-camel)', countValue: 1 };
    if (n <= 90) return { dueTextAr: 'بنتا لبون (2)', dueTextEn: '2 Bint Labun', countValue: 2 };
    if (n <= 120) return { dueTextAr: 'حقتان (2)', dueTextEn: '2 Hiqqah', countValue: 2 };
    // Above 120: in every 40 a Bint Labun, in every 50 a Hiqqah
    let best40 = 0, best50 = 0, minRem = Infinity;
    for (let h = Math.floor(n / 50); h >= 0; h--) {
      const rem = n - h * 50;
      const b = Math.floor(rem / 40);
      const finalRem = rem - b * 40;
      if (finalRem < minRem) {
        minRem = finalRem;
        best40 = b;
        best50 = h;
      }
      if (finalRem === 0) break;
    }
    const partsAr = [];
    const partsEn = [];
    if (best40 > 0) {
      partsAr.push(`${best40} بنت لبون`);
      partsEn.push(`${best40} Bint Labun`);
    }
    if (best50 > 0) {
      partsAr.push(`${best50} حقة`);
      partsEn.push(`${best50} Hiqqah`);
    }
    return {
      dueTextAr: partsAr.join(' + '),
      dueTextEn: partsEn.join(' + '),
      countValue: best40 + best50
    };
  }

  return { dueTextAr: 'لا زكاة', dueTextEn: 'No Zakat', countValue: 0 };
}

export const MASARIF_DATA = [
  {
    id: 1,
    color: '#10b981',
    icon: '🤲',
    titleAr: 'الفقراء',
    titleEn: 'Al-Fuqara (The Poor)',
    descAr: 'من لا يجد شيئاً أو يجد أقل من نصف كفايته من طعام وشراب ومسكن وملبس.',
    descEn: 'Those who have nothing or less than half of their basic needs.'
  },
  {
    id: 2,
    color: '#06b6d4',
    icon: '🏠',
    titleAr: 'المساكين',
    titleEn: 'Al-Masakin (The Needy)',
    descAr: 'من يجد نصف كفايته فأكثر ولكن لا تكتمل حاجته الأساسية على وجه اللزوم.',
    descEn: 'Those who have some means but still fall short of basic sufficiency.'
  },
  {
    id: 3,
    color: '#3b82f6',
    icon: '📋',
    titleAr: 'العاملون عليها',
    titleEn: 'Zakat Administrators',
    descAr: 'السعاة الذين يوليهم ولي الأمر لجمع الزكاة وحفظها وتوزيعها على مستحقيها.',
    descEn: 'Officials appointed to collect, guard, and distribute Zakat.'
  },
  {
    id: 4,
    color: '#8b5cf6',
    icon: '🤝',
    titleAr: 'المؤلفة قلوبهم',
    titleEn: 'Reconciling Hearts',
    descAr: 'من يُرجى إسلامه أو تثبيت إيمانه أو كف شره عن المسلمين.',
    descEn: 'New Muslims or those whose hearts are inclined toward Islam.'
  },
  {
    id: 5,
    color: '#f59e0b',
    icon: '🕊️',
    titleAr: 'في الرقاب',
    titleEn: 'Freeing Captives',
    descAr: 'تحرير العبيد والمكاتبين وفك أسرى المسلمين.',
    descEn: 'Freeing slaves, captives, and helping those in bondage.'
  },
  {
    id: 6,
    color: '#ec4899',
    icon: '⚖️',
    titleAr: 'الغارمون',
    titleEn: 'Those in Debt',
    descAr: 'المدينون العاجزون عن سداد ديونهم المشروعة لإصلاح ذات البين أو حاجة مباحة.',
    descEn: 'Debtors overwhelmed by lawful debts who cannot repay them.'
  },
  {
    id: 7,
    color: '#ef4444',
    icon: '🛡️',
    titleAr: 'في سبيل الله',
    titleEn: 'In the Cause of Allah',
    descAr: 'المجاهدون المتطوعون لحماية الدين والأوطان وما يدخل في نصرة الدين.',
    descEn: 'Striving in the path of Allah to defend and uphold the faith.'
  },
  {
    id: 8,
    color: '#14b8a6',
    icon: '🧭',
    titleAr: 'ابن السبيل',
    titleEn: 'The Wayfarer',
    descAr: 'المسافر المنقطع عن بلده وماله، فيُعطى ما يوصله إلى بلده ولو كان غنياً فيه.',
    descEn: 'Stranded travelers cut off from their wealth, given enough to return home.'
  }
];
