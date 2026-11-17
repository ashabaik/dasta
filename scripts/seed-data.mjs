// Sample data. Everything here is illustrative: suppliers, buyers, products, prices and stock are
// made up. No real brands.
//
// Every private field carries a marker (DSPRIV..). The privacy tests search every page, table and
// function result for these markers while signed in as a buyer or as another supplier.

export const EMAIL_DOMAIN = "dasta.example";

const pad = (n) => String(n).padStart(2, "0");

/** Private identity of sample supplier n. */
export function sellerIdentity(n) {
  const k = pad(n);
  return {
    legal_name: `Sample Supplier ${k} Trading (sample) DSPRIV${k}NAME`,
    contact_name: `Sample Contact ${k} DSPRIV${k}CONTACT`,
    phone: `+20 000 000 01${k}`,
    email: `contact${k}.dspriv${k}email@${EMAIL_DOMAIN}`,
    address: `Unit ${k}, Sample Trade Park (sample) DSPRIV${k}ADDR`,
    tax_id: `000-000-1${k} DSPRIV${k}TAX`,
    bank_name: `Sample Bank (sample) DSPRIV${k}BANK`,
    iban: `EG00 0000 0000 0000 0000 0000 01${k} DSPRIV${k}IBAN`,
  };
}

export function buyerIdentity(n) {
  const k = pad(n);
  return {
    company_name: `Sample Shop ${k} (sample) DSPRIVB${k}COMPANY`,
    contact_name: `Sample Buyer ${k} DSPRIVB${k}CONTACT`,
    phone: `+20 000 000 02${k}`,
    address: `Shop ${k}, Sample Market Street (sample) DSPRIVB${k}ADDR`,
  };
}

/** Strings that must never reach a buyer or another supplier, for supplier n. */
export function sellerCanaries(n) {
  const k = pad(n);
  return [`DSPRIV${k}`, `dspriv${k}email`, `000 000 01${k}`, `00000001${k}`, `seller${n}@${EMAIL_DOMAIN}`];
}

export const users = [
  { key: "admin", email: `admin@${EMAIL_DOMAIN}`, role: "admin" },
  { key: "buyer1", email: `buyer1@${EMAIL_DOMAIN}`, role: "buyer", n: 1, code: "B-4K7PD", region: "cairo" },
  { key: "buyer2", email: `buyer2@${EMAIL_DOMAIN}`, role: "buyer", n: 2, code: "B-9WX2M", region: "alexandria" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ key: `seller${n}`, email: `seller${n}@${EMAIL_DOMAIN}`, role: "seller", n })),
];

export const sellers = [
  { n: 1, code: "S-7Q4X", region: "giza", status: "active", verified: true },
  { n: 2, code: "S-M2KD", region: "alexandria", status: "active", verified: true },
  { n: 3, code: "S-9RWB", region: "sharqia", status: "active", verified: false },
  { n: 4, code: "S-K8TN", region: "cairo", status: "active", verified: true },
  { n: 5, code: "S-3HVC", region: "qalyubia", status: "active", verified: true },
  { n: 6, code: "S-W6PA", region: "suez", status: "pending", verified: false },
];

const spec = (k_en, k_ar, v) => ({ k_en, k_ar, v });
const S = {
  mat: (v) => spec("Material", "الخامة", v),
  cap: (v) => spec("Capacity", "السعة", v),
  size: (v) => spec("Size", "المقاس", v),
  carton: (v) => spec("Carton", "الكرتونة", v),
  pages: (v) => spec("Pages", "عدد الصفحات", v),
  weight: (v) => spec("Weight", "الوزن", v),
  set: (v) => spec("Set", "الطقم", v),
};
const UNIT = { piece: ["piece", "قطعة"], set: ["set", "طقم"], box: ["box", "علبة"] };
const DESC = [
  "Sold by the carton. Colours and finish can vary slightly between batches. Samples are available on request through messages.",
  "يُباع بالكرتونة. قد تختلف الألوان والتشطيب قليلًا بين التشغيلات. العينات متاحة عند الطلب عبر الرسائل.",
];

/** Two price breaks, at 4 and 10 times the minimum order: 8% and 15% under the base price. */
const breaks = (egp, moq) => [
  { qty: moq * 4, price_piastres: Math.round(egp * 92) },
  { qty: moq * 10, price_piastres: Math.round(egp * 85) },
];

// One row per sample listing. `img` is the photograph in scripts/seed-images (see credits.json there).
const row = (seller, cat, code, img, egp, unit, moq, lead, stock, en, ar, specs) => ({
  seller, cat, code, img, egp, stock, en, ar, specs,
  condition: "new",
  unit_en: UNIT[unit][0], unit_ar: UNIT[unit][1],
  moq, lead, breaks: breaks(egp, moq),
  desc_en: DESC[0], desc_ar: DESC[1],
});

export const products = [
  row(1, "home-kitchen", "HK-101", "mugs", 68, "piece", 48, 6, 4800, "Stoneware cups, hand-finished", "أكواب خزفية بتشطيب يدوي", [S.mat("Stoneware"), S.cap("250 ml"), S.carton("12 pieces")]),
  row(1, "home-kitchen", "HK-102", "jars", 54, "piece", 60, 4, 6000, "Glass storage jars, clip lid", "برطمانات زجاجية بغطاء محكم", [S.mat("Glass"), S.cap("1 l"), S.carton("12 pieces")]),
  row(1, "home-kitchen", "HK-103", "boards", 145, "piece", 24, 8, 1200, "Acacia serving board", "لوح تقديم من خشب الأكاسيا", [S.mat("Acacia wood"), S.size("38 × 22 cm"), S.carton("6 pieces")]),
  row(1, "home-kitchen", "HK-104", "cutlery", 420, "set", 12, 7, 600, "Stainless cutlery, 24 pieces", "طقم أدوات مائدة 24 قطعة", [S.mat("Stainless steel"), S.set("24 pieces"), S.carton("4 sets")]),

  row(2, "home-kitchen", "HK-105", "baskets", 96, "piece", 30, 9, 1500, "Woven storage baskets", "سلال تخزين منسوجة", [S.mat("Rattan"), S.size("30 cm"), S.carton("10 pieces")]),
  row(2, "textiles", "TX-401", "tote", 32, "piece", 200, 6, 20000, "Cotton tote bags, plain", "حقائب قماش قطنية سادة", [S.mat("Cotton canvas"), S.size("38 × 42 cm"), S.carton("100 pieces")]),
  row(2, "textiles", "TX-402", "towels", 118, "piece", 50, 7, 2500, "Cotton bath towels", "مناشف حمام قطنية", [S.mat("Cotton"), S.size("70 × 140 cm"), S.carton("10 pieces")]),

  row(3, "office-supplies", "OF-201", "notebooks", 58, "piece", 100, 5, 10000, "Hardcover notebooks, A5", "دفاتر بغلاف مقوى مقاس A5", [S.size("A5"), S.pages("192"), S.carton("20 pieces")]),
  row(3, "office-supplies", "OF-202", "pens", 39, "box", 120, 4, 12000, "Colouring pencils, box of 24", "أقلام تلوين، علبة 24 قلم", [S.set("24 pencils"), S.carton("48 boxes")]),

  row(4, "packaging", "PK-301", "boxes", 9, "piece", 500, 3, 50000, "Kraft mailer boxes", "علب شحن كرافت", [S.mat("Kraft board"), S.size("25 × 18 × 8 cm"), S.carton("50 pieces")]),
  row(4, "packaging", "PK-302", "cups", 3, "piece", 1000, 3, 100000, "Paper cups with lids, 8 oz", "أكواب ورقية بغطاء 8 أونصة", [S.cap("8 oz"), S.carton("1,000 pieces")]),

  row(5, "personal-care", "PC-501", "soap", 27, "piece", 150, 5, 15000, "Handmade soap bars", "صابون مصنوع يدويًا", [S.weight("100 g"), S.carton("50 pieces")]),
  row(5, "personal-care", "PC-502", "bottles", 135, "piece", 40, 8, 2000, "Insulated steel bottle, 500 ml", "زجاجة ستيل حافظة للحرارة 500 مل", [S.mat("Stainless steel"), S.cap("500 ml"), S.carton("20 pieces")]),

  // Supplier 6 is still waiting for approval, so this listing is hidden from buyers.
  row(6, "tools-hardware", "TL-601", "tools", 380, "set", 15, 6, 300, "Combination spanner set", "طقم مفاتيح بلدي ومشرشر", [S.set("12 pieces"), S.carton("5 sets")]),
];

// Sample orders, each taken through the real order functions up to the state named in `to`.
// paid_out = completed and already paid to the supplier. Quantities respect each minimum order.
export const sampleOrders = [
  { buyer: "buyer1", code: "HK-101", qty: 96, to: "paid_out" },
  { buyer: "buyer1", code: "TX-402", qty: 100, to: "shipped" },
  { buyer: "buyer1", code: "HK-102", qty: 60, to: "paid_held" },
  { buyer: "buyer1", code: "OF-201", qty: 100, to: "pending_payment" },
  { buyer: "buyer2", code: "HK-103", qty: 24, to: "disputed" },
  { buyer: "buyer2", code: "PK-301", qty: 500, to: "completed" },
  { buyer: "buyer2", code: "HK-104", qty: 12, to: "completed" },
  { buyer: "buyer1", code: "PC-501", qty: 150, to: "refunded" },
];

// Sample conversations. The last two messages of the second one are meant to be stopped by the filter,
// so the moderation queue has something in it. The number in it is made up.
export const sampleThreads = [
  {
    buyer: "buyer1", seller: "seller1", code: "HK-101",
    messages: [
      ["buyer", "Hello. Are the cups dishwasher safe?"],
      ["seller", "Yes, and microwave safe."],
      ["buyer", "Good. I need 96 pieces this week."],
      ["seller", "They are in stock. You can order from the product page."],
    ],
  },
  {
    buyer: "buyer2", seller: "seller2", code: "TX-402",
    messages: [
      ["buyer", "هل المناشف قطن بالكامل وفي الكرتونة الأصلية؟"],
      ["seller", "نعم، والتسليم عن طريق المنصة."],
      ["seller", "كلمني على ٠١٠٠٠٠٠٠١٥٥ ونتفق على سعر أحسن"],
      ["buyer", "do you have whatsapp?"],
    ],
  },
];

/** The catalogue the live site shows. The database tests use tests/fixtures.mjs instead. */
export const showcase = { products, sampleOrders, sampleThreads, images: true };
