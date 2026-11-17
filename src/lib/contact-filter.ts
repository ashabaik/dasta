/**
 * Contact-detail filter for chat messages and seller-written listing text.
 *
 * Goal: a buyer and a seller must not be able to pass a phone number, an e-mail address, a link or a
 * handle to each other. The filter normalises the text first (so tricks with scripts, spacing and
 * invisible characters do not help), then looks for contact details.
 *
 * Verdicts:
 *   clean  delivered
 *   hold   not delivered, goes to the admin's moderation queue (possible false positive, no strike)
 *   block  not delivered, goes to the queue, and the sender gets a strike
 *
 * Known limits (also listed in the README): a determined pair can still agree on a code over many
 * messages, describe a number in words the filter does not know, or show it in a photo of the part.
 * The filter raises the cost; the moderation queue and the strikes handle the rest.
 */

export type Verdict = "clean" | "hold" | "block";
export type FilterResult = { verdict: Verdict; reasons: string[] };

const ZERO_WIDTH = /[​-‏‪-‮⁠-⁤﻿­͏؜]/g;
const TATWEEL = /ـ/g;
const ARABIC_DIACRITICS = /[ً-ٰٟ]/g;

/** Digits written in other scripts -> 0-9. NFKC already folds full-width and superscript digits. */
function foldDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

/** Letters from other alphabets that look like Latin ones, used to disguise "com", "at" and so on. */
const LOOKALIKES: Record<string, string> = { а: "a", е: "e", о: "o", с: "c", р: "p", х: "x", у: "y", і: "i", ѕ: "s", ԁ: "d", ɡ: "g", "＠": "@" };

export function normalise(input: string): string {
  let s = input.normalize("NFKC").replace(ZERO_WIDTH, "").replace(TATWEEL, "").replace(ARABIC_DIACRITICS, "");
  s = foldDigits(s).toLowerCase();
  s = s.replace(/[аеосрхуіѕԁɡ＠]/g, (c) => LOOKALIKES[c] ?? c);
  // Arabic letter variants that people use interchangeably.
  s = s.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ؤ]/g, "و").replace(/[ئ]/g, "ي");
  return s;
}

// Digit words, after normalise(). English, Modern Standard Arabic and Egyptian Arabic.
const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  صفر: "0", زيرو: "0",
  واحد: "1", واحده: "1",
  اتنين: "2", اثنين: "2", اثنان: "2", اتنان: "2",
  تلاته: "3", ثلاثه: "3", تلات: "3", ثلاث: "3",
  اربعه: "4", اربع: "4",
  خمسه: "5", خمس: "5",
  سته: "6", ست: "6",
  سبعه: "7", سبع: "7",
  تمانيه: "8", ثمانيه: "8", تمان: "8", ثمان: "8",
  تسعه: "9", تسع: "9",
};

/** Replaces digit words by digits so "zero one zero ..." and "صفر واحد ..." read like a number. */
function wordsToDigits(s: string): string {
  return s.replace(/[\p{L}]+/gu, (w) => DIGIT_WORDS[w] ?? w);
}

/** A calendar date such as 17/11/2026 is not a phone number. Only real-looking dates are set aside. */
function dropDates(s: string): string {
  return s.replace(/(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](20\d\d|\d\d)(?!\d)/g, (m, d, mo) =>
    Number(d) >= 1 && Number(d) <= 31 && Number(mo) >= 1 && Number(mo) <= 12 ? " date " : m,
  );
}

/** Longest run of digits where only number-style separators sit between them. */
function longestDigitRun(input: string): number {
  const s = dropDates(input);
  let best = 0;
  for (const m of s.matchAll(/\+?\d(?:[\s\-.()/_,،]{0,3}\d)*/g)) {
    best = Math.max(best, m[0].replace(/\D/g, "").length);
  }
  return best;
}

const PLATFORM_WORDS =
  /(whats\s?app|wats\s?app|watsap|whatsap|telegram|messenger|facebook|fb\.com|instagram|insta\b|viber|linkedin|snapchat|tiktok|skype|imo\b|واتس\s?اب|وتس\s?اب|واتساب|وتساب|واتس|تليجرام|تيليجرام|تلجرام|ماسنجر|فيسبوك|فيس\s?بوك|انستجرام|انستا|فايبر)/u;

const CALL_WORDS =
  /(call\s+me|ring\s+me|text\s+me|my\s+(number|phone|mobile|cell|e-?mail|address)|phone\s+number|mobile\s+number|contact\s+me\s+(directly|outside)|outside\s+the\s+(platform|site|app)|اتصل\s+بي|اتصل\s+بيا|كلمني|كلمنى|رقمي|رقم\s+(موبايلي|تليفوني|تلفوني|الموبايل|التليفون|الهاتف|هاتفي)|موبايلي|تليفوني|تلفوني|ايميلي|بريدي|عنواني|بره\s+(المنصه|الموقع)|خارج\s+(المنصه|الموقع))/u;

const MAIL_DOMAINS = /\b(gmail|yahoo|hotmail|outlook|icloud|protonmail|ymail)\b/;
const TLD = "(?:com|net|org|eg|io|me|co|info|biz|app|link|ly|xyz|online|store|shop|site|dev|ae|sa)";

const EMAIL = new RegExp(`[a-z0-9._%+-]{1,64}\\s*@\\s*[a-z0-9-]+(?:\\s*\\.\\s*[a-z0-9-]+)+`);
// "name at domain dot com", "name (at) domain (dot) com", "name [at] domain . com", "... دوت كوم"
const EMAIL_SPELLED = new RegExp(
  `[a-z0-9._%+-]{2,}\\s*(?:[\\[({<]\\s*(?:at|ات)\\s*[\\])}>]|\\s+(?:at|ات)\\s+)\\s*[a-z0-9-]{2,}\\s*(?:\\.|[\\[({<]\\s*(?:dot|دوت|نقطه)\\s*[\\])}>]|\\s+(?:dot|دوت|نقطه)\\s+)\\s*(?:${TLD.slice(3, -1)}|كوم|نت)`,
  "u",
);
const DOT_COM_SPELLED = /(?:\bdot\s*(?:com|net|org|eg)\b|دوت\s*(?:كوم|نت|اورج))/u;
// A dot with spaces around it only counts for com / net / org, so "valve. Me too" is not a link.
const URL = new RegExp(
  `(?:https?:\\/\\/|www\\s*\\.|\\b[a-z0-9-]{2,}\\.${TLD}\\b|\\b[a-z0-9-]{2,}\\s*\\.\\s*(?:com|net|org)\\b|\\b(?:wa\\.me|t\\.me|bit\\.ly|fb\\.me|m\\.me)\\b)`,
);
const HANDLE = /(?:^|[\s(:،,])@[a-z0-9_.]{3,}/;

/**
 * Checks one text. `previous` are the sender's own most recent messages in the same thread, oldest
 * first; they are only used to catch a number that is split over several messages.
 */
export function checkText(text: string, previous: string[] = []): FilterResult {
  const reasons: string[] = [];
  let verdict: Verdict = "clean";
  const raise = (v: Verdict, reason: string) => {
    reasons.push(reason);
    if (v === "block" || (v === "hold" && verdict === "clean")) verdict = v;
  };

  const n = normalise(text);
  const asDigits = wordsToDigits(n);
  const run = longestDigitRun(n);
  const spelledRun = longestDigitRun(asDigits);

  // --- phone numbers ---
  const egyptian = /(?:\+|00)\s?20[\s\-.()]*1|(?:^|\D)01[0125][\s\-.()]*\d/.test(asDigits);
  if (run >= 9 || (run >= 7 && egyptian)) raise("block", "phone_number");
  else if (run >= 7) raise("hold", "long_number");
  if (spelledRun >= 7 && spelledRun > run) raise("block", "spelled_out_number");

  // --- e-mail ---
  if (EMAIL.test(n) || EMAIL_SPELLED.test(n)) raise("block", "email");
  else if (MAIL_DOMAINS.test(n)) raise("hold", "mail_provider");

  // --- links and handles ---
  if (URL.test(n) || DOT_COM_SPELLED.test(n)) raise("block", "link");
  if (HANDLE.test(n) || (/@/.test(n) && !reasons.includes("email"))) raise("block", "handle");

  // --- other apps and "call me" ---
  const platform = PLATFORM_WORDS.test(n);
  const call = CALL_WORDS.test(n);
  if (platform || call) {
    const digitsNearby = Math.max(run, spelledRun) >= 4;
    raise(digitsNearby ? "block" : "hold", platform ? "other_app" : "contact_request");
  }

  // --- a number split over several messages ---
  // Only when this message is nothing but a short number: join it with the short numeric messages
  // that came right before it.
  const onlyNumber = (s: string) => {
    const d = wordsToDigits(normalise(s));
    const digits = d.replace(/\D/g, "");
    return digits.length >= 1 && digits.length <= 6 && d.replace(/[\d\s\-.()/_,،+]/g, "") === "" ? digits : null;
  };
  const mine = onlyNumber(text);
  if (mine !== null && verdict === "clean") {
    let joined = mine;
    for (let i = previous.length - 1; i >= 0 && previous.length - i <= 6; i--) {
      const d = onlyNumber(previous[i]);
      if (d === null) break;
      joined = d + joined;
    }
    if (joined.length >= 7 && joined.length > mine.length) raise("block", "split_number");
  }

  return { verdict, reasons: [...new Set(reasons)] };
}

/** For listings: checks every text field a seller can type. */
export function checkListing(fields: (string | null | undefined)[]): FilterResult {
  const out: FilterResult = { verdict: "clean", reasons: [] };
  for (const f of fields) {
    if (!f) continue;
    const r = checkText(f);
    if (r.verdict === "block" || (r.verdict === "hold" && out.verdict === "clean")) out.verdict = r.verdict;
    out.reasons.push(...r.reasons);
  }
  out.reasons = [...new Set(out.reasons)];
  return out;
}
