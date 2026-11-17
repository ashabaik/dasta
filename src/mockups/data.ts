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
  breaks: [number, number][]; // [from quantity, price per unit]
};

const p = (id: string, cat: string, en: string, ar: string, price: number, unitEn: string, unitAr: string, moq: number, lead: number, supplier: string): Product => ({
  id, img: `/mk/${id}.jpg`, cat, en, ar, price, unitEn, unitAr, moq, lead, supplier,
  breaks: [[moq, price], [moq * 4, Math.round(price * 0.92)], [moq * 10, Math.round(price * 0.85)]],
});

export const products: Product[] = [
  p("mugs", "home", "Stoneware cups, hand-finished", "أكواب خزفية بتشطيب يدوي", 68, "piece", "قطعة", 48, 6, "SP-2041"),
  p("jars", "home", "Glass storage jars, clip lid", "برطمانات زجاجية بغطاء محكم", 54, "piece", "قطعة", 60, 4, "SP-1187"),
  p("boards", "home", "Acacia serving board", "لوح تقديم من خشب الأكاسيا", 145, "piece", "قطعة", 24, 8, "SP-3310"),
  p("cookware", "home", "Stainless steel stockpot set", "طقم قدور ستانلس ستيل", 1290, "set", "طقم", 6, 10, "SP-0926"),
  p("cutlery", "home", "Stainless cutlery, 24 pieces", "طقم أدوات مائدة 24 قطعة", 420, "set", "طقم", 12, 7, "SP-0926"),
  p("baskets", "home", "Woven storage baskets", "سلال تخزين منسوجة", 96, "piece", "قطعة", 30, 9, "SP-3310"),
  p("lamp", "home", "Ceramic table lamp", "أباجورة مكتب خزفية", 610, "piece", "قطعة", 10, 12, "SP-2041"),
  p("notebooks", "office", "Hardcover notebooks, A5", "دفاتر بغلاف مقوى مقاس A5", 58, "piece", "قطعة", 100, 5, "SP-4472"),
  p("pens", "office", "Colouring pencils, box of 24", "أقلام تلوين، علبة 24 قلم", 39, "box", "علبة", 120, 4, "SP-4472"),
  p("boxes", "packaging", "Kraft mailer boxes", "علب شحن كرافت", 9, "piece", "قطعة", 500, 3, "SP-5108"),
  p("cups", "packaging", "Paper cups with lids, 8 oz", "أكواب ورقية بغطاء 8 أونصة", 3, "piece", "قطعة", 1000, 3, "SP-5108"),
  p("tote", "textiles", "Cotton tote bags, plain", "حقائب قماش قطنية سادة", 32, "piece", "قطعة", 200, 6, "SP-6093"),
  p("towels", "textiles", "Cotton bath towels", "مناشف حمام قطنية", 118, "piece", "قطعة", 50, 7, "SP-6093"),
  p("soap", "care", "Handmade soap bars", "صابون مصنوع يدويًا", 27, "piece", "قطعة", 150, 5, "SP-7215"),
  p("bottles", "care", "Insulated steel bottle, 500 ml", "زجاجة ستيل حافظة للحرارة 500 مل", 135, "piece", "قطعة", 40, 8, "SP-7215"),
  p("tools", "tools", "Combination spanner set", "طقم مفاتيح بلدي ومشرشر", 380, "set", "طقم", 15, 6, "SP-8350"),
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
  { no: "RF-48190", item: "towels", qty: 100, total: 11800, status: "shipped", buyer: "BY-1047" },
  { no: "RF-48144", item: "mugs", qty: 240, total: 15120, status: "completed", buyer: "BY-2260" },
  { no: "RF-48102", item: "towels", qty: 50, total: 5900, status: "completed", buyer: "BY-3391" },
  { no: "RF-48077", item: "mugs", qty: 48, total: 3264, status: "refunded", buyer: "BY-5518" },
];
export const sumOrders = (...statuses: string[]) => orders.filter((o) => statuses.includes(o.status)).reduce((a, o) => a + o.total, 0);

// The chosen direction (Dasta) shows only photographs that sit well together on a light page.
// The lamp photograph is the home hero, so it is never a product; the dark stockpot and tool
// photographs wait for lighter replacements.
const HELD_BACK = ["lamp", "cookware", "tools"];
export const dastaProducts = products.filter((x) => !HELD_BACK.includes(x.id));
export const dastaCategories = categories.filter((c) => dastaProducts.some((x) => x.cat === c.key));
export const dastaCount = (key: string) => dastaProducts.filter((x) => x.cat === key).length;
/** One photograph stands for each category in the category scene; those products stay out of the home grid. */
export const categoryCover: Record<string, string> = { home: "jars", office: "notebooks", packaging: "boxes", textiles: "towels", care: "soap" };

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
  more: "More from this supplier",
  moreIn: "More in",
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
  signIn: "Sign in",
  sellOn: "Sell on Dasta",
  createAccount: "Create account",
  shopByCat: "Shop by category",
  shopByCatText: "Pick a category to see everything in it.",
  howText: "Every order follows the same three steps.",
  closing: "Your next order starts here.",
  closingText: "Create an account, compare price breaks and order by the carton.",
  fMarket: "Marketplace",
  fSelling: "Selling",
  fSafety: "Buying safely",
  fLang: "Language",
  aboutDasta: "About Dasta",
  tagline: "A wholesale marketplace for shops, cafes and offices.",
  signInTitle: "Sign in to Dasta",
  email: "Email",
  password: "Password",
  newHere: "New to Dasta?",
  sampleTitle: "Look around with a sample account",
  sampleText: "Dasta is a portfolio project. These accounts open the marketplace with sample data, and no payment is ever charged.",
  buyerAcc: "Buyer account",
  buyerAccText: "Place an order and follow it to delivery.",
  supplierAcc: "Supplier account",
  supplierAccText: "Manage listings, ship orders and see payouts.",
  adminAcc: "Admin account",
  adminAccText: "Review suppliers, payments and disputes.",
  supplierCode: "Supplier",
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
  more: "منتجات أخرى من نفس المورّد",
  moreIn: "المزيد في",
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
  signIn: "تسجيل الدخول",
  sellOn: "بِع على دستة",
  createAccount: "أنشئ حسابًا",
  shopByCat: "تسوّق حسب الفئة",
  shopByCatText: "اختر فئة لعرض كل ما فيها.",
  howText: "كل طلب يمر بالخطوات الثلاث نفسها.",
  closing: "طلبك القادم يبدأ من هنا.",
  closingText: "أنشئ حسابًا، قارن شرائح الأسعار، واطلب بالكرتونة.",
  fMarket: "السوق",
  fSelling: "البيع",
  fSafety: "شراء آمن",
  fLang: "اللغة",
  aboutDasta: "عن دستة",
  tagline: "سوق جملة للمحلات والمقاهي والمكاتب.",
  signInTitle: "سجّل الدخول إلى دستة",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  newHere: "جديد على دستة؟",
  sampleTitle: "تصفّح بحساب نموذجي",
  sampleText: "دستة مشروع ضمن معرض أعمال. هذه الحسابات تفتح السوق ببيانات نموذجية، ولا يُخصم أي مبلغ فعلي.",
  buyerAcc: "حساب مشترٍ",
  buyerAccText: "اطلب وتابع طلبك حتى الاستلام.",
  supplierAcc: "حساب مورّد",
  supplierAccText: "أدِر منتجاتك واشحن الطلبات وتابع تحويلاتك.",
  adminAcc: "حساب الإدارة",
  adminAccText: "راجع المورّدين والمدفوعات والنزاعات.",
  supplierCode: "المورّد",
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
