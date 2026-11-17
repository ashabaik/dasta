// Sample data for the demo. Everything here is fictional and illustrative:
// sellers, buyers, part numbers, prices and stock are made up. No real brands.
//
// Every private field carries a marker (MKPRIV..). The privacy tests search every page, table and
// function result for these markers while signed in as a buyer or as another seller.

export const EMAIL_DOMAIN = "makbas.example";

const pad = (n) => String(n).padStart(2, "0");

/** Private identity of sample seller n. */
export function sellerIdentity(n) {
  const k = pad(n);
  return {
    legal_name: `Sample Seller ${k} Trading (fictional) MKPRIV${k}NAME`,
    contact_name: `Sample Contact ${k} MKPRIV${k}CONTACT`,
    phone: `+20 000 000 01${k}`,
    email: `contact${k}.mkpriv${k}email@${EMAIL_DOMAIN}`,
    address: `Plot ${k}, Sample Industrial Zone (fictional) MKPRIV${k}ADDR`,
    tax_id: `000-000-1${k} MKPRIV${k}TAX`,
    bank_name: `Sample Bank (fictional) MKPRIV${k}BANK`,
    iban: `EG00 0000 0000 0000 0000 0000 01${k} MKPRIV${k}IBAN`,
  };
}

export function buyerIdentity(n) {
  const k = pad(n);
  return {
    company_name: `Sample Factory ${k} (fictional) MKPRIVB${k}COMPANY`,
    contact_name: `Sample Buyer ${k} MKPRIVB${k}CONTACT`,
    phone: `+20 000 000 02${k}`,
    address: `Gate ${k}, Sample Factory Road (fictional) MKPRIVB${k}ADDR`,
  };
}

/** Strings that must never reach a buyer or another seller, for seller n. */
export function sellerCanaries(n) {
  const k = pad(n);
  return [`MKPRIV${k}`, `mkpriv${k}email`, `000 000 01${k}`, `00000001${k}`, `seller${n}@${EMAIL_DOMAIN}`];
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
  disp: (v) => spec("Displacement", "الإزاحة", v),
  pmax: (v) => spec("Max pressure", "أقصى ضغط", v),
  bore: (v) => spec("Bore / rod", "القطر / الذراع", v),
  stroke: (v) => spec("Stroke", "الشوط", v),
  size: (v) => spec("Size", "المقاس", v),
  coil: (v) => spec("Coil", "الملف", v),
  port: (v) => spec("Ports", "الفتحات", v),
  mat: (v) => spec("Material", "الخامة", v),
  filt: (v) => spec("Filtration", "درجة الترشيح", v),
  len: (v) => spec("Length", "الطول", v),
  dim: (v) => spec("Dimensions", "الأبعاد", v),
  ratio: (v) => spec("Ratio", "النسبة", v),
  shaft: (v) => spec("Shaft", "العمود", v),
  qty: (v) => spec("Pack", "العبوة", v),
  flow: (v) => spec("Max flow", "أقصى تدفق", v),
};

// [seller n, category slug, part number, condition, price in EGP, stock, title_en, title_ar, specs]
export const products = [
  [1, "hydraulic-pumps", "HP-GP-0163", "new", 8400, 4, "Hydraulic gear pump, 16 cc/rev", "مضخة ترسية هيدروليكية 16 سم³/لفة", [S.disp("16 cc/rev"), S.pmax("250 bar"), S.shaft("9T spline")]],
  [1, "hydraulic-pumps", "HP-VP-0250", "refurbished", 11200, 2, "Vane pump, 25 cc/rev", "مضخة ريشية 25 سم³/لفة", [S.disp("25 cc/rev"), S.pmax("175 bar")]],
  [1, "hydraulic-pumps", "HP-AP-0450", "used", 38500, 1, "Axial piston pump, 45 cc/rev, variable", "مضخة مكبسية محورية 45 سم³/لفة متغيرة الإزاحة", [S.disp("45 cc/rev"), S.pmax("280 bar")]],
  [1, "valves", "HV-DC-4306", "new", 3200, 7, "Directional control valve, 4/3, NG6", "صمام تحكم اتجاهي 4/3 مقاس NG6", [S.size("NG6"), S.coil("24 V DC"), S.pmax("315 bar")]],
  [1, "valves", "HV-PR-1010", "new", 2650, 9, "Pressure relief valve, NG10", "صمام تنفيس ضغط مقاس NG10", [S.size("NG10"), S.pmax("350 bar")]],
  [1, "filters", "HF-RL-0010", "new", 540, 40, "Return line filter element, 10 µm", "عنصر فلتر خط الراجع 10 ميكرون", [S.filt("10 µm"), S.flow("120 l/min")]],
  [1, "seals", "HS-CK-6336", "new", 780, 25, "Cylinder seal kit, 63/36", "طقم موانع تسرب لأسطوانة 63/36", [S.bore("63 / 36 mm"), S.mat("PU + NBR")]],
  [1, "hoses-fittings", "HH-2S-1220", "new", 950, 18, "High-pressure hose assembly, DN12, 2 m", "خرطوم ضغط عالٍ DN12 بطول 2 متر", [S.size("DN12"), S.len("2 m"), S.pmax("275 bar")]],

  [2, "hydraulic-cylinders", "HC-DA-6336", "refurbished", 12750, 1, "Double-acting cylinder, 63/36 × 400 mm", "أسطوانة مزدوجة الفعل 63/36 × 400 مم", [S.bore("63 / 36 mm"), S.stroke("400 mm"), S.pmax("210 bar")]],
  [2, "hydraulic-cylinders", "HC-DA-1056", "new", 24900, 2, "Double-acting cylinder, 100/56 × 600 mm", "أسطوانة مزدوجة الفعل 100/56 × 600 مم", [S.bore("100 / 56 mm"), S.stroke("600 mm"), S.pmax("250 bar")]],
  [2, "hydraulic-cylinders", "HC-SA-8030", "used", 7600, 3, "Single-acting plunger cylinder, 80 × 300 mm", "أسطوانة مفردة الفعل بمكبس غاطس 80 × 300 مم", [S.bore("80 mm"), S.stroke("300 mm")]],
  [2, "seals", "HS-OR-0382", "new", 620, 30, "O-ring assortment, NBR 70, metric", "طقم حلقات مطاطية NBR 70 بمقاسات مترية", [S.mat("NBR 70"), S.qty("382 pcs")]],
  [2, "seals", "HS-RS-3646", "new", 185, 120, "Rod seal, 36 × 46 × 8, polyurethane", "مانع تسرب ذراع 36 × 46 × 8 بولي يوريثان", [S.dim("36 × 46 × 8 mm"), S.mat("PU")]],
  [2, "valves", "HV-CV-0012", "new", 410, 35, "Inline check valve, G1/2", "صمام عدم رجوع خطي G1/2", [S.port("G1/2"), S.pmax("350 bar")]],

  [3, "bearings", "MB-DG-6205", "new", 145, 200, "Deep groove ball bearing, 6205 2RS", "رولمان بلي كروي عميق 6205 2RS", [S.dim("25 × 52 × 15 mm"), S.mat("Chrome steel")]],
  [3, "bearings", "MB-TR-30210", "new", 520, 60, "Tapered roller bearing, 30210", "رولمان بلي مخروطي 30210", [S.dim("50 × 90 × 21.75 mm")]],
  [3, "bearings", "MB-PB-0040", "new", 690, 25, "Pillow block bearing unit, 40 mm shaft", "كرسي رولمان بلي لعمود 40 مم", [S.shaft("40 mm"), S.mat("Cast iron housing")]],
  [3, "power-transmission", "MT-JC-2838", "new", 870, 15, "Jaw coupling 28/38 with spider", "وصلة مرنة فكية 28/38 مع نجمة", [S.size("28/38"), S.mat("Aluminium / PU")]],
  [3, "power-transmission", "MT-WG-6330", "used", 5400, 2, "Worm gearbox, size 63, ratio 30:1", "صندوق تروس دودي مقاس 63 بنسبة 30:1", [S.ratio("30:1"), S.size("63")]],

  [4, "valves", "HV-PF-0606", "refurbished", 14800, 1, "Proportional flow control valve, NG6", "صمام تحكم تناسبي في التدفق مقاس NG6", [S.size("NG6"), S.coil("24 V DC"), S.flow("40 l/min")]],
  [4, "valves", "HV-BV-0034", "new", 1150, 22, "High-pressure ball valve, G3/4", "محبس كروي ضغط عالٍ G3/4", [S.port("G3/4"), S.pmax("350 bar")]],
  [4, "hoses-fittings", "HH-QC-0012", "new", 480, 50, "Hydraulic quick coupling set, ISO-A, 1/2 inch", "طقم وصلة سريعة هيدروليكية ISO-A مقاس 1/2 بوصة", [S.size('1/2"'), S.pmax("250 bar")]],
  [4, "hoses-fittings", "HH-TF-1210", "new", 360, 45, "Straight tube fitting, 12L, pack of 10", "وصلة مواسير مستقيمة 12L عبوة 10 قطع", [S.size("12L"), S.qty("10 pcs")]],
  [4, "filters", "HF-SS-0125", "new", 290, 30, "Suction strainer, G1, 125 µm", "مصفاة سحب G1 بدرجة 125 ميكرون", [S.port("G1"), S.filt("125 µm")]],

  [5, "hydraulic-pumps", "HP-HP-0025", "new", 4300, 6, "Double-acting hand pump, 25 cc/stroke", "مضخة يدوية مزدوجة الفعل 25 سم³/شوط", [S.disp("25 cc/stroke"), S.pmax("350 bar")]],
  [5, "power-transmission", "MT-BH-1012", "new", 2100, 8, "Bell housing and coupling kit, motor frame 100/112", "طقم جرس توصيل ووصلة لمحرك إطار 100/112", [S.size("100/112")]],
  [5, "filters", "HF-PF-0020", "new", 3650, 5, "Pressure filter housing with element, 20 µm", "مبيت فلتر ضغط مع عنصر 20 ميكرون", [S.filt("20 µm"), S.pmax("315 bar")]],
  [5, "bearings", "MB-RE-0016", "new", 310, 40, "Spherical plain rod end, M16", "نهاية ذراع كروية M16", [S.size("M16"), S.mat("Steel / PTFE")]],

  [6, "hydraulic-cylinders", "HC-TC-3120", "used", 18900, 1, "Telescopic cylinder, 3 stages, 1200 mm stroke", "أسطوانة تلسكوبية 3 مراحل بشوط 1200 مم", [S.stroke("1200 mm")]],
  [6, "hydraulic-pumps", "HP-GP-0080", "new", 5200, 3, "Hydraulic gear pump, 8 cc/rev", "مضخة ترسية هيدروليكية 8 سم³/لفة", [S.disp("8 cc/rev"), S.pmax("250 bar")]],
];
