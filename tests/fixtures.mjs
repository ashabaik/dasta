// Test fixtures: the catalogue the database tests run against. Neutral on purpose: the tests care about
// who owns a listing, its stock and its price, not about what it is. Codes are opaque identifiers.
// Minimum order is 1 and there are no price breaks, unless a test sets them itself.
//
// Sellers, buyers and identities (with their private markers) come from scripts/seed-data.mjs.

const item = (p) => ({ ...p, en: `Fixture item ${p.code}`, ar: `صنف اختباري ${p.code}`, specs: [] });

export const products = [
  { seller: 1, cat: "home-kitchen", code: "HP-GP-0163", condition: "new", egp: 8400, stock: 4 },
  { seller: 1, cat: "home-kitchen", code: "HP-VP-0250", condition: "refurbished", egp: 11200, stock: 2 },
  { seller: 1, cat: "home-kitchen", code: "HP-AP-0450", condition: "used", egp: 38500, stock: 1 },
  { seller: 1, cat: "packaging", code: "HV-DC-4306", condition: "new", egp: 3200, stock: 7 },
  { seller: 1, cat: "packaging", code: "HV-PR-1010", condition: "new", egp: 2650, stock: 9 },
  { seller: 1, cat: "home-kitchen", code: "HF-RL-0010", condition: "new", egp: 540, stock: 40 },
  { seller: 1, cat: "personal-care", code: "HS-CK-6336", condition: "new", egp: 780, stock: 25 },
  { seller: 1, cat: "textiles", code: "HH-2S-1220", condition: "new", egp: 950, stock: 18 },
  { seller: 2, cat: "office-supplies", code: "HC-DA-6336", condition: "refurbished", egp: 12750, stock: 1 },
  { seller: 2, cat: "office-supplies", code: "HC-DA-1056", condition: "new", egp: 24900, stock: 2 },
  { seller: 2, cat: "office-supplies", code: "HC-SA-8030", condition: "used", egp: 7600, stock: 3 },
  { seller: 2, cat: "personal-care", code: "HS-OR-0382", condition: "new", egp: 620, stock: 30 },
  { seller: 2, cat: "personal-care", code: "HS-RS-3646", condition: "new", egp: 185, stock: 120 },
  { seller: 2, cat: "packaging", code: "HV-CV-0012", condition: "new", egp: 410, stock: 35 },
  { seller: 3, cat: "tools-hardware", code: "MB-DG-6205", condition: "new", egp: 145, stock: 200 },
  { seller: 3, cat: "tools-hardware", code: "MB-TR-30210", condition: "new", egp: 520, stock: 60 },
  { seller: 3, cat: "tools-hardware", code: "MB-PB-0040", condition: "new", egp: 690, stock: 25 },
  { seller: 3, cat: "electronics-accessories", code: "MT-JC-2838", condition: "new", egp: 870, stock: 15 },
  { seller: 3, cat: "electronics-accessories", code: "MT-WG-6330", condition: "used", egp: 5400, stock: 2 },
  { seller: 4, cat: "packaging", code: "HV-PF-0606", condition: "refurbished", egp: 14800, stock: 1 },
  { seller: 4, cat: "packaging", code: "HV-BV-0034", condition: "new", egp: 1150, stock: 22 },
  { seller: 4, cat: "textiles", code: "HH-QC-0012", condition: "new", egp: 480, stock: 50 },
  { seller: 4, cat: "textiles", code: "HH-TF-1210", condition: "new", egp: 360, stock: 45 },
  { seller: 4, cat: "home-kitchen", code: "HF-SS-0125", condition: "new", egp: 290, stock: 30 },
  { seller: 5, cat: "home-kitchen", code: "HP-HP-0025", condition: "new", egp: 4300, stock: 6 },
  { seller: 5, cat: "electronics-accessories", code: "MT-BH-1012", condition: "new", egp: 2100, stock: 8 },
  { seller: 5, cat: "home-kitchen", code: "HF-PF-0020", condition: "new", egp: 3650, stock: 5 },
  { seller: 5, cat: "tools-hardware", code: "MB-RE-0016", condition: "new", egp: 310, stock: 40 },
  { seller: 6, cat: "office-supplies", code: "HC-TC-3120", condition: "used", egp: 18900, stock: 1 },
  { seller: 6, cat: "home-kitchen", code: "HP-GP-0080", condition: "new", egp: 5200, stock: 3 },
].map(item);

// Sample orders, each taken through the real order functions up to the state named in `to`.
// paid_out = completed and already paid to the seller.
export const sampleOrders = [
  { buyer: "buyer1", code: "HV-DC-4306", qty: 2, to: "paid_out" },
  { buyer: "buyer1", code: "HC-DA-1056", qty: 1, to: "shipped" },
  { buyer: "buyer1", code: "HF-RL-0010", qty: 10, to: "paid_held" },
  { buyer: "buyer1", code: "MB-DG-6205", qty: 20, to: "pending_payment" },
  { buyer: "buyer2", code: "HS-CK-6336", qty: 4, to: "disputed" },
  { buyer: "buyer2", code: "HV-BV-0034", qty: 5, to: "completed" },
  { buyer: "buyer1", code: "HH-QC-0012", qty: 6, to: "refunded" },
];

// Sample conversations. The last two messages of the second one are meant to be stopped by the filter,
// so the moderation queue has something in it. The number in it is made up.
export const sampleThreads = [
  {
    buyer: "buyer1", seller: "seller1", code: "HV-DC-4306",
    messages: [
      ["buyer", "Hello. Is this the 24 pack or the 48 pack?"],
      ["seller", "The 24 pack. The 48 pack is available on request."],
      ["buyer", "Good. I need 2 cartons this week."],
      ["seller", "Both are in stock. You can order from the product page."],
    ],
  },
  {
    buyer: "buyer2", seller: "seller2", code: "HC-DA-1056",
    messages: [
      ["buyer", "هل البضاعة جديدة وفي الكرتونة الأصلية؟"],
      ["seller", "نعم جديدة، والتسليم عن طريق المنصة."],
      ["seller", "كلمني على ٠١٠٠٠٠٠٠١٥٥ ونتفق على سعر أحسن"],
      ["buyer", "do you have whatsapp?"],
    ],
  },
];

export const fixtures = { products, sampleOrders, sampleThreads, images: false };
