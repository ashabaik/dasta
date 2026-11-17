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
  pack: (v) => spec("Carton", "الكرتونة", v),
  size: (v) => spec("Size", "المقاس", v),
};
// Arabic for the detail values, so an Arabic page never shows a line in English.
const MAT_AR = {
  Stoneware: "خزف حجري", Glass: "زجاج", "Acacia wood": "خشب الأكاسيا", "Stainless steel": "ستانلس ستيل",
  "Aluminium, non-stick coating": "ألومنيوم بطلاء غير لاصق", Ceramic: "خزف", Porcelain: "بورسلين", Rattan: "خوص",
  "Cotton canvas": "قماش قطني سميك", Cotton: "قطن", "Cotton blend": "قطن مخلوط", Linen: "كتان", "Kraft board": "كرتون كرافت",
  "Kraft paper": "ورق كرافت", Tinplate: "صفيح", "Glass, cork": "زجاج وفلين", Wood: "خشب", Plastic: "بلاستيك", Steel: "صلب",
  "Steel head, rubber grip": "رأس صلب ومقبض مطاطي",
};
const PACK_AR = { pieces: "قطعة", sets: "طقم", boxes: "علبة", jars: "برطمان", packs: "عبوة", rolls: "رول" };
const SIZE_AR = {
  "150 cm wide": "عرض 150 سم", "50 m roll": "رول 50 مترًا", "100 clips per box": "100 مشبك في العلبة", "50 envelopes per pack": "50 ظرفًا في العبوة",
  "12 clips per box": "12 مشبكًا في العلبة", "50 cards per pack": "50 كارتًا في العبوة", "100 screws per box": "100 مسمار في العلبة",
};
const arValue = (s) => {
  if (s.k_en === "Material") return MAT_AR[s.v];
  if (s.k_en === "Size") return SIZE_AR[s.v];
  const m = /^([\d,]+) (\w+)$/.exec(s.v);
  return m && PACK_AR[m[2]] ? `${m[1]} ${PACK_AR[m[2]]}` : undefined;
};

const UNIT = {
  piece: ["piece", "قطعة"], set: ["set", "طقم"], box: ["box", "علبة"], pack: ["pack", "عبوة"], roll: ["roll", "رول"], metre: ["metre", "متر"], jar: ["jar", "برطمان"],
};
const DESC = [
  "Sold by the carton. Colours and finish can vary slightly between batches. Samples are available on request through messages.",
  "يُباع بالكرتونة. قد تختلف الألوان والتشطيب قليلًا بين التشغيلات. العينات متاحة عند الطلب عبر الرسائل.",
];

/** Two price breaks, at 4 and 10 times the minimum order: 8% and 15% under the base price. */
const breaks = (egp, moq) => [
  { qty: moq * 4, price_piastres: Math.round(egp * 92) },
  { qty: moq * 10, price_piastres: Math.round(egp * 85) },
];

// One row per sample listing. `img` is its photograph in scripts/seed-images (see credits.json there);
// no photograph is used for two listings. Names describe what the photograph shows.
const row = (seller, cat, code, img, egp, unit, moq, lead, stock, en, ar, specs) => ({
  seller, cat, code, img, egp, stock, en, ar,
  specs: specs.map((x) => (arValue(x) ? { ...x, v_ar: arValue(x) } : x)),
  condition: "new",
  unit_en: UNIT[unit][0], unit_ar: UNIT[unit][1],
  moq, lead, breaks: breaks(egp, moq),
  desc_en: DESC[0], desc_ar: DESC[1],
});

export const products = [
  // Supplier 1 (the sample supplier account): home and kitchen
  row(1, "home-kitchen", "HK-101", "mugs", 68, "piece", 48, 6, 4800, "Stoneware cups, hand-finished", "أكواب خزفية بتشطيب يدوي", [S.mat("Stoneware"), S.pack("12 pieces")]),
  row(1, "home-kitchen", "HK-102", "jars", 54, "piece", 60, 4, 6000, "Glass storage jars, clip lid", "برطمانات زجاجية بغطاء محكم", [S.mat("Glass"), S.pack("12 pieces")]),
  row(1, "home-kitchen", "HK-103", "boards", 145, "piece", 24, 8, 1200, "Acacia serving board", "لوح تقديم من خشب الأكاسيا", [S.mat("Acacia wood"), S.pack("6 pieces")]),
  row(1, "home-kitchen", "HK-104", "cutlery", 420, "set", 12, 7, 600, "Stainless cutlery, 24 pieces", "طقم أدوات مائدة 24 قطعة", [S.mat("Stainless steel"), S.pack("4 sets")]),
  row(1, "home-kitchen", "HK-105", "cookware-light", 1150, "set", 6, 10, 240, "Non-stick saucepan set, 3 pieces", "طقم حلل غير لاصقة 3 قطع", [S.mat("Aluminium, non-stick coating"), S.pack("2 sets")]),
  row(1, "home-kitchen", "HK-106", "casserole", 310, "piece", 12, 9, 480, "Speckled ceramic casserole with lid", "طاجن خزف منقّط بغطاء", [S.mat("Ceramic"), S.pack("4 pieces")]),
  row(1, "home-kitchen", "HK-107", "plates-white", 42, "piece", 72, 5, 7200, "Porcelain dinner plates", "أطباق بورسلين أبيض", [S.mat("Porcelain"), S.pack("24 pieces")]),

  // Supplier 2: home accessories and textiles
  row(2, "home-kitchen", "HK-108", "baskets", 96, "piece", 30, 9, 1500, "Woven storage baskets", "سلال تخزين منسوجة", [S.mat("Rattan"), S.pack("10 pieces")]),
  row(2, "home-kitchen", "HK-109", "carafe-glass", 165, "set", 24, 7, 960, "Glass carafe with tumbler", "دورق زجاج مع كوب", [S.mat("Glass"), S.pack("6 sets")]),
  row(2, "home-kitchen", "HK-110", "vases-ceramic", 240, "set", 12, 10, 360, "Small ceramic vases, set of 3", "فازات خزف صغيرة، طقم 3 قطع", [S.mat("Ceramic"), S.pack("4 sets")]),
  row(2, "textiles", "TX-401", "tote", 32, "piece", 200, 6, 20000, "Cotton tote bags, plain", "حقائب قماش قطنية سادة", [S.mat("Cotton canvas"), S.pack("100 pieces")]),
  row(2, "textiles", "TX-402", "towels", 118, "piece", 50, 7, 2500, "Cotton bath towels", "مناشف حمام قطنية", [S.mat("Cotton"), S.pack("10 pieces")]),
  row(2, "textiles", "TX-403", "blankets-folded", 285, "piece", 20, 9, 800, "Knitted throws", "بطاطين خفيفة محبوكة", [S.mat("Cotton blend"), S.pack("5 pieces")]),
  row(2, "textiles", "TX-404", "linen-folded", 135, "metre", 50, 6, 5000, "Linen fabric lengths", "أقمشة كتان", [S.mat("Linen"), S.size("150 cm wide")]),
  row(2, "textiles", "TX-405", "cushions", 75, "piece", 40, 8, 1600, "Patterned cushion covers", "أغطية وسائد منقوشة", [S.mat("Cotton"), S.pack("20 pieces")]),
  row(2, "textiles", "TX-406", "fabric-roll", 2400, "roll", 2, 12, 60, "Raw cotton fabric roll", "رول قماش قطن خام", [S.mat("Cotton"), S.size("50 m roll")]),

  // Supplier 3: office supplies and hand tools
  row(3, "office-supplies", "OF-201", "notebooks", 58, "piece", 100, 5, 10000, "Hardcover notebooks, A5", "دفاتر بغلاف مقوى مقاس A5", [S.size("A5"), S.pack("20 pieces")]),
  row(3, "office-supplies", "OF-202", "colour-pencils", 39, "box", 120, 4, 12000, "Colour pencils, box of 24", "أقلام تلوين، علبة 24 قلم", [S.pack("48 boxes")]),
  row(3, "office-supplies", "OF-203", "paper-clips", 18, "box", 200, 3, 20000, "Copper paper clips", "مشابك ورق نحاسية", [S.size("100 clips per box"), S.pack("100 boxes")]),
  row(3, "office-supplies", "OF-204", "pins-jars", 46, "jar", 60, 5, 3000, "Push pins and clips in glass jars", "دبابيس ومشابك في برطمان زجاج", [S.pack("12 jars")]),
  row(3, "office-supplies", "OF-205", "envelopes", 35, "pack", 100, 4, 8000, "Cream envelopes", "أظرف كريمي", [S.size("50 envelopes per pack"), S.pack("40 packs")]),
  row(3, "office-supplies", "OF-206", "binder-clips", 14, "box", 240, 3, 24000, "Binder clips", "مشابك كلبس معدنية", [S.size("12 clips per box"), S.pack("120 boxes")]),
  row(3, "office-supplies", "OF-207", "blank-cards", 28, "pack", 100, 4, 9000, "Blank cards", "كروت سادة", [S.size("50 cards per pack"), S.pack("50 packs")]),
  row(3, "tools-hardware", "TL-602", "screwdrivers", 55, "set", 60, 5, 3000, "Screwdrivers, set of 2", "مفكات، طقم قطعتين", [S.pack("30 sets")]),
  row(3, "tools-hardware", "TL-603", "hammer-nails", 95, "piece", 36, 6, 1800, "Claw hammer", "شاكوش بمخلب", [S.mat("Steel head, rubber grip"), S.pack("12 pieces")]),

  // Supplier 4: packaging
  row(4, "packaging", "PK-301", "boxes", 9, "piece", 500, 3, 50000, "Kraft mailer boxes", "علب شحن كرافت", [S.mat("Kraft board"), S.pack("50 pieces")]),
  row(4, "packaging", "PK-302", "cups", 3, "piece", 1000, 3, 100000, "Paper cups with lids, 8 oz", "أكواب ورقية بغطاء 8 أونصة", [S.pack("1,000 pieces")]),
  row(4, "packaging", "PK-303", "kraft-pouch", 4, "piece", 1000, 4, 100000, "Kraft stand-up pouches with window", "أكياس كرافت بنافذة وسحّاب", [S.mat("Kraft paper"), S.pack("1,000 pieces")]),
  row(4, "packaging", "PK-304", "tin-can", 22, "piece", 200, 6, 12000, "Tin cans with handle", "علب صفيح بيد", [S.mat("Tinplate"), S.pack("50 pieces")]),
  row(4, "packaging", "PK-305", "kraft-wrap-twine", 48, "set", 60, 4, 3000, "Kraft wrapping paper with cotton twine", "ورق كرافت للتغليف مع خيط قطن", [S.pack("30 sets")]),
  row(4, "packaging", "PK-306", "kraft-paper-rolls", 26, "roll", 100, 4, 8000, "Kraft paper rolls", "رولات ورق كرافت", [S.mat("Kraft paper"), S.pack("25 rolls")]),
  row(4, "packaging", "PK-307", "cork-jars", 38, "piece", 120, 6, 6000, "Glass jars with cork lids", "برطمانات زجاج بغطاء فلين", [S.mat("Glass, cork"), S.pack("24 pieces")]),

  // Supplier 5: personal care, plus one hand tool
  row(5, "personal-care", "PC-501", "soap", 27, "piece", 150, 5, 15000, "Handmade soap bars", "صابون مصنوع يدويًا", [S.pack("50 pieces")]),
  row(5, "personal-care", "PC-502", "bottles", 135, "piece", 40, 8, 2000, "Insulated steel bottle, 500 ml", "زجاجة ستيل حافظة للحرارة 500 مل", [S.mat("Stainless steel"), S.pack("20 pieces")]),
  row(5, "personal-care", "PC-503", "wooden-comb", 24, "piece", 120, 5, 9000, "Wooden comb", "مشط خشب", [S.mat("Wood"), S.pack("60 pieces")]),
  row(5, "personal-care", "PC-504", "pump-bottle", 19, "piece", 300, 5, 30000, "Refillable pump bottle", "عبوة بمضخة للصابون السائل", [S.mat("Plastic"), S.pack("100 pieces")]),
  row(5, "personal-care", "PC-505", "balm-tin", 33, "piece", 144, 6, 7200, "Balm in a tin", "بلسم في علبة معدنية", [S.pack("72 pieces")]),
  row(5, "personal-care", "PC-506", "soap-bars-white", 12, "piece", 300, 4, 30000, "White soap bars", "قوالب صابون أبيض", [S.pack("100 pieces")]),
  row(5, "personal-care", "PC-507", "cream-jars", 8, "piece", 500, 5, 50000, "White cosmetic jars", "برطمانات كريم بيضاء", [S.mat("Plastic"), S.pack("250 pieces")]),
  row(5, "tools-hardware", "TL-601", "tools-light", 120, "piece", 30, 6, 1500, "Adjustable wrench", "مفتاح فرنساوي", [S.mat("Steel"), S.pack("10 pieces")]),

  // Supplier 6 is still waiting for approval, so this listing is hidden from buyers.
  row(6, "tools-hardware", "TL-604", "screws", 16, "box", 200, 3, 20000, "Wood screws", "مسامير قلاووظ للخشب", [S.size("100 screws per box"), S.pack("100 boxes")]),
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
