// Shared sample content for the three design mockups. Static, illustrative: no database behind it.
// Photos: see public/mk/credits.json (Unsplash Licence).

export type Lang = "en" | "ar";
export const asLang = (v: string): Lang => (v === "ar" ? "ar" : "en");

export type Product = {
  id: string;
  img: string;
  cat: string;
  en: string;
  ar: string;
  price: number; // EGP per unit at the first price break
  unitEn: string;
  unitAr: string;
  moq: number;
  lead: number; // days
  supplier: string;
  rating: number;
  breaks: [number, number][]; // [from quantity, price per unit]
};

const p = (id: string, cat: string, en: string, ar: string, price: number, unitEn: string, unitAr: string, moq: number, lead: number, supplier: string, rating: number): Product => ({
  id, img: `/mk/${id}.jpg`, cat, en, ar, price, unitEn, unitAr, moq, lead, supplier, rating,
  breaks: [[moq, price], [moq * 4, Math.round(price * 0.92)], [moq * 10, Math.round(price * 0.85)]],
});

export const products: Product[] = [
  p("mugs", "home", "Stoneware cups, hand-finished", "أكواب خزفية بتشطيب يدوي", 68, "piece", "قطعة", 48, 6, "SP-2041", 4.8),
  p("jars", "home", "Glass storage jars, clip lid", "برطمانات زجاجية بغطاء محكم", 54, "piece", "قطعة", 60, 4, "SP-1187", 4.6),
  p("boards", "home", "Acacia serving board", "لوح تقديم من خشب الأكاسيا", 145, "piece", "قطعة", 24, 8, "SP-3310", 4.7),
  p("cookware", "home", "Stainless steel stockpot set", "طقم قدور ستانلس ستيل", 1290, "set", "طقم", 6, 10, "SP-0926", 4.9),
  p("cutlery", "home", "Stainless cutlery, 24 pieces", "طقم أدوات مائدة 24 قطعة", 420, "set", "طقم", 12, 7, "SP-0926", 4.5),
  p("baskets", "home", "Woven storage baskets", "سلال تخزين منسوجة", 96, "piece", "قطعة", 30, 9, "SP-3310", 4.4),
  p("lamp", "home", "Ceramic table lamp", "أباجورة مكتب خزفية", 610, "piece", "قطعة", 10, 12, "SP-2041", 4.7),
  p("notebooks", "office", "Hardcover notebooks, A5", "دفاتر بغلاف مقوى مقاس A5", 58, "piece", "قطعة", 100, 5, "SP-4472", 4.6),
  p("pens", "office", "Colouring pencils, box of 24", "أقلام تلوين، علبة 24 قلم", 39, "box", "علبة", 120, 4, "SP-4472", 4.3),
  p("boxes", "packaging", "Kraft mailer boxes", "علب شحن كرافت", 9, "piece", "قطعة", 500, 3, "SP-5108", 4.8),
  p("cups", "packaging", "Paper cups with lids, 8 oz", "أكواب ورقية بغطاء 8 أونصة", 3, "piece", "قطعة", 1000, 3, "SP-5108", 4.5),
  p("tote", "textiles", "Cotton tote bags, plain", "حقائب قماش قطنية سادة", 32, "piece", "قطعة", 200, 6, "SP-6093", 4.6),
  p("towels", "textiles", "Cotton bath towels", "مناشف حمام قطنية", 118, "piece", "قطعة", 50, 7, "SP-6093", 4.7),
  p("soap", "care", "Handmade soap bars", "صابون مصنوع يدويًا", 27, "piece", "قطعة", 150, 5, "SP-7215", 4.8),
  p("bottles", "care", "Insulated steel bottle, 500 ml", "زجاجة ستيل حافظة للحرارة 500 مل", 135, "piece", "قطعة", 40, 8, "SP-7215", 4.4),
  p("tools", "tools", "Combination spanner set", "طقم مفاتيح بلدي ومشرشر", 380, "set", "طقم", 15, 6, "SP-8350", 4.6),
];

export const categories: { key: string; en: string; ar: string }[] = [
  { key: "home", en: "Home and kitchen", ar: "المنزل والمطبخ" },
  { key: "office", en: "Office supplies", ar: "مستلزمات مكتبية" },
  { key: "packaging", en: "Packaging", ar: "التعبئة والتغليف" },
  { key: "textiles", en: "Textiles", ar: "المنسوجات" },
  { key: "care", en: "Personal care", ar: "العناية الشخصية" },
  { key: "tools", en: "Tools and hardware", ar: "العدد والأدوات" },
];
export const countIn = (key: string) => products.filter((x) => x.cat === key).length;

export const orders = [
  { no: "RF-48213", item: "mugs", qty: 96, total: 6528, status: "awaiting", buyer: "BY-3391" },
  { no: "RF-48190", item: "lamp", qty: 20, total: 12200, status: "shipped", buyer: "BY-1047" },
  { no: "RF-48144", item: "mugs", qty: 240, total: 15014, status: "completed", buyer: "BY-2260" },
  { no: "RF-48102", item: "lamp", qty: 10, total: 6100, status: "completed", buyer: "BY-3391" },
  { no: "RF-48077", item: "mugs", qty: 48, total: 3264, status: "refunded", buyer: "BY-5518" },
];

const en = {
  dir: "ltr" as const,
  other: "العربية",
  search: "Search products or suppliers",
  explore: "Explore the marketplace",
  exploreAs: "Explore as",
  asBuyer: "Explore as buyer",
  asSupplier: "Explore as supplier",
  asAdmin: "Explore as admin",
  asAny: "Explore as buyer, supplier or admin",
  decrease: "Decrease quantity",
  increase: "Increase quantity",
  buyer: "Buyer",
  supplier: "Supplier",
  admin: "Admin",
  categories: "Categories",
  all: "All products",
  newIn: "New this week",
  from: "from",
  per: "per",
  moq: "Minimum order",
  lead: "Ships in",
  days: "days",
  verified: "Verified supplier",
  protectedPay: "Protected payment",
  protectedPayText: "You pay the marketplace. The supplier is paid after you confirm delivery.",
  verifiedText: "Every supplier is checked before the first listing goes live.",
  messages: "Messages stay on the platform",
  messagesText: "Ask about sizes, samples and delivery without leaving your order.",
  orderProtection: "Order protection",
  priceBreaks: "Price breaks",
  quantity: "Quantity",
  unitPrice: "Unit price",
  addToOrder: "Add to order",
  message: "Message supplier",
  details: "Details",
  detailsText: "Sold by the carton. Colours and finish can vary slightly between batches. Samples are available on request through messages.",
  soldBy: "Sold by",
  rating: "rating",
  more: "More from this supplier",
  dashboard: "Supplier dashboard",
  hello: "Good morning",
  awaiting: "Awaiting shipment",
  protectedBal: "Protected balance",
  ready: "Ready for payout",
  listings: "Listings",
  ofTen: "of 10",
  recent: "Recent orders",
  order: "Order",
  item: "Item",
  total: "Total",
  status: "Status",
  st: { awaiting: "Awaiting shipment", shipped: "Shipped", completed: "Completed", refunded: "Refunded" } as Record<string, string>,
  ship: "Mark as shipped",
  view: "View",
  egp: "EGP",
  footer: "Portfolio project by Ahmed Shabayek",
  about: "About",
  home: "Home",
  orders: "Orders",
  account: "Account",
  inbox: "Messages",
  sample: "Suppliers, products and prices are sample data.",
  heroA: "Wholesale goods, bought with confidence.",
  heroASub: "Order by the carton from verified suppliers. Your payment is protected until the goods arrive.",
  heroB: "Stock your business from one place.",
  heroBSub: "Verified suppliers, clear price breaks and protected payment on every order.",
  heroC: "Wholesale, by the carton.",
  heroCSub: "A plain catalogue of goods from verified suppliers. Payment is protected until you confirm delivery.",
  nProducts: "products",
  nSuppliers: "verified suppliers",
  nCategories: "categories",
  addListing: "Add listing",
  saving: "Saving",
  selected: "Selected",
  howTitle: "How buying works",
  steps: [
    ["Order by the carton", "Choose a quantity. The price break for that quantity applies on its own."],
    ["Pay the marketplace", "Your payment is held safely and the supplier ships your order."],
    ["Confirm delivery", "When the goods arrive and you confirm, the supplier is paid."],
  ] as [string, string][],
};

const ar: typeof en = {
  dir: "rtl" as const as never,
  other: "English",
  search: "ابحث عن منتج أو مورّد",
  explore: "تصفّح السوق",
  exploreAs: "تصفّح كـ",
  asBuyer: "تصفّح كمشترٍ",
  asSupplier: "تصفّح كمورّد",
  asAdmin: "تصفّح كمدير",
  asAny: "تصفّح كمشترٍ أو مورّد أو مدير",
  decrease: "تقليل الكمية",
  increase: "زيادة الكمية",
  buyer: "مشترٍ",
  supplier: "مورّد",
  admin: "إدارة",
  categories: "الفئات",
  all: "كل المنتجات",
  newIn: "جديد هذا الأسبوع",
  from: "من",
  per: "لكل",
  moq: "أقل كمية",
  lead: "الشحن خلال",
  days: "أيام",
  verified: "مورّد موثّق",
  protectedPay: "دفع محمي",
  protectedPayText: "تدفع للسوق، ويستلم المورّد مبلغه بعد أن تؤكد الاستلام.",
  verifiedText: "كل مورّد تتم مراجعته قبل نشر أول منتج له.",
  messages: "الرسائل داخل المنصة",
  messagesText: "اسأل عن المقاسات والعينات والتسليم من داخل طلبك.",
  orderProtection: "حماية الطلب",
  priceBreaks: "شرائح الأسعار",
  quantity: "الكمية",
  unitPrice: "سعر الوحدة",
  addToOrder: "أضف إلى الطلب",
  message: "راسل المورّد",
  details: "التفاصيل",
  detailsText: "يُباع بالكرتونة. قد تختلف الألوان والتشطيب قليلًا بين التشغيلات. العينات متاحة عند الطلب عبر الرسائل.",
  soldBy: "المورّد",
  rating: "تقييم",
  more: "منتجات أخرى من نفس المورّد",
  dashboard: "لوحة المورّد",
  hello: "صباح الخير",
  awaiting: "في انتظار الشحن",
  protectedBal: "رصيد محمي",
  ready: "جاهز للتحويل",
  listings: "المنتجات",
  ofTen: "من 10",
  recent: "أحدث الطلبات",
  order: "الطلب",
  item: "المنتج",
  total: "الإجمالي",
  status: "الحالة",
  st: { awaiting: "في انتظار الشحن", shipped: "تم الشحن", completed: "مكتمل", refunded: "مُسترد" },
  ship: "تأكيد الشحن",
  view: "عرض",
  egp: "ج.م",
  footer: "مشروع ضمن أعمال أحمد شبايك",
  about: "عن السوق",
  home: "الرئيسية",
  orders: "الطلبات",
  account: "الحساب",
  inbox: "الرسائل",
  sample: "المورّدون والمنتجات والأسعار بيانات نموذجية.",
  heroA: "بضائع بالجملة، تشتريها وأنت مطمئن.",
  heroASub: "اطلب بالكرتونة من مورّدين موثّقين. مبلغك محمي حتى تصل البضاعة.",
  heroB: "جهّز مخزون نشاطك من مكان واحد.",
  heroBSub: "مورّدون موثّقون، شرائح أسعار واضحة، ودفع محمي في كل طلب.",
  heroC: "جملة، بالكرتونة.",
  heroCSub: "كتالوج واضح لبضائع من مورّدين موثّقين. الدفع محمي حتى تؤكد الاستلام.",
  nProducts: "منتجات",
  nSuppliers: "مورّدون موثّقون",
  nCategories: "فئات",
  addListing: "أضف منتجًا",
  saving: "التوفير",
  selected: "المختار",
  howTitle: "كيف يتم الشراء",
  steps: [
    ["اطلب بالكرتونة", "اختر الكمية، وتُطبَّق شريحة السعر المناسبة تلقائيًا."],
    ["ادفع للسوق", "يُحفظ مبلغك بأمان ويشحن المورّد طلبك."],
    ["أكّد الاستلام", "عند وصول البضاعة وتأكيدك، يستلم المورّد مبلغه."],
  ] as [string, string][],
};
ar.dir = "rtl" as never;

export const dict = (lang: Lang) => (lang === "ar" ? ar : en);
export type T = typeof en;
export const name = (x: { en: string; ar: string }, lang: Lang) => (lang === "ar" ? x.ar : x.en);
export const unit = (x: Product, lang: Lang) => (lang === "ar" ? x.unitAr : x.unitEn);
export const money = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const byId = (id: string) => products.find((x) => x.id === id)!;
export const PORTFOLIO_URL = "https://ashabaik.github.io";
