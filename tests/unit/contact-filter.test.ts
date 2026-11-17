import { describe, expect, it } from "vitest";
import { checkListing, checkText, normalise } from "@/lib/contact-filter";

// All numbers, addresses and names below are made up for the tests.

const blocked = (text: string, previous: string[] = []) => checkText(text, previous).verdict === "block";
const clean = (text: string, previous: string[] = []) => checkText(text, previous).verdict === "clean";

describe("phone numbers", () => {
  it.each([
    ["Latin digits", "call 01000000123"],
    ["with spaces", "010 0000 0123"],
    ["a space between every digit", "0 1 0 0 0 0 0 0 1 2 3"],
    ["with dashes and dots", "010-0000.0123"],
    ["with brackets", "(010) 0000 0123"],
    ["international form", "+20 100 000 0123"],
    ["00 prefix", "0020 100 000 0123"],
    ["landline with area code", "02 2000 0123 9"],
    ["inside a sentence", "my colleague is on 01000000123 after 5 pm"],
  ])("blocks %s", (_label, text) => {
    expect(blocked(text)).toBe(true);
  });

  it.each([
    ["Arabic-Indic digits", "٠١٠٠٠٠٠٠١٢٣"],
    ["Arabic-Indic digits with spaces", "٠١٠ ٠٠٠٠ ٠١٢٣"],
    ["Persian digits", "۰۱۰۰۰۰۰۰۱۲۳"],
    ["Arabic-Indic and Latin mixed", "٠١٠0000٠١٢٣"],
    ["full-width digits", "０１０００００００１２３"],
    ["Arabic sentence with Arabic-Indic digits", "كلمني على ٠١٠٠٠٠٠٠١٢٣"],
  ])("blocks %s", (_label, text) => {
    expect(blocked(text)).toBe(true);
  });

  it.each([
    ["zero-width characters between digits", "010​000‍00‌123"],
    ["a right-to-left mark inside", "0100‏0000123"],
    ["a soft hyphen inside", "0100­0000123"],
    ["tatweel between Arabic-Indic digits", "٠١٠ـ٠٠٠٠ـ٠١٢٣"],
  ])("blocks a number hidden with %s", (_label, text) => {
    expect(blocked(text)).toBe(true);
  });

  it.each([
    ["English words", "zero one zero zero zero zero zero zero one two three"],
    ["English words with oh", "oh one oh five five five one two three four"],
    ["Standard Arabic words", "صفر واحد صفر صفر صفر صفر صفر صفر واحد اثنان ثلاثة"],
    ["Egyptian Arabic words", "صفر واحد صفر خمسة خمسة خمسة واحد اتنين تلاتة اربعة"],
    ["Arabic words with diacritics and hamza", "صِفر واحد صفر أربعة خمسة ستة سبعة ثمانية تسعة"],
    ["words and digits mixed", "zero 1 zero 0 five 5 five 1 two 3"],
  ])("blocks a number spelled out in %s", (_label, text) => {
    expect(blocked(text)).toBe(true);
  });

  it("holds a shorter long number for review instead of blocking", () => {
    expect(checkText("ref 5551234 for the pallet").verdict).toBe("hold");
  });

  it("catches a number split over several messages", () => {
    expect(blocked("0123", ["Is it in stock?", "010", "0000"])).toBe(true);
    expect(blocked("٠١٢٣", ["٠١٠", "٠٠٠٠"])).toBe(true);
    expect(blocked("one two three", ["zero one zero", "zero zero zero zero"])).toBe(true);
  });

  it("does not treat a lone short number as a split number", () => {
    expect(clean("20", ["How many do you need?"])).toBe(true);
    expect(clean("250", ["What pressure?", "bar"])).toBe(true);
  });
});

describe("e-mail addresses", () => {
  it.each([
    "write to sample.person@example.com",
    "sample.person @ example . com",
    "sample.person at example dot com",
    "sample.person (at) example (dot) com",
    "sample.person [at] example [dot] net",
    "sample.person＠example.com",
    "sample.person at example دوت كوم",
  ])("blocks %s", (text) => {
    expect(blocked(text)).toBe(true);
  });

  it("holds a bare mail provider name for review", () => {
    expect(checkText("I am on gmail, same name as the company").verdict).toBe("hold");
  });
});

describe("links and handles", () => {
  it.each([
    "see https://example.com/catalogue",
    "www.example.com",
    "example.com has the drawing",
    "our site is example . com",
    "example dot com",
    "wa.me/201000000123",
    "t.me/samplechannel",
    "find me @sample_handle",
    "insta: @samplehandle",
    "ехаmple.com", // Cyrillic look-alike letters
  ])("blocks %s", (text) => {
    expect(blocked(text)).toBe(true);
  });
});

describe("moving to another app", () => {
  it.each([
    ["WhatsApp with a number", "whatsapp 0100 000 0123"],
    ["WhatsApp in Arabic with a number", "واتساب ٠١٠٠٠٠٠٠١٢٣"],
    ["call me with a few digits", "call me, extension 4521"],
  ])("blocks %s", (_label, text) => {
    expect(blocked(text)).toBe(true);
  });

  it.each([
    ["WhatsApp without a number", "do you have whatsapp?"],
    ["Arabic WhatsApp without a number", "عندك واتس اب؟"],
    ["Telegram in Arabic", "ابعتلي على تليجرام"],
    ["asking to call", "كلمني ضروري"],
    ["asking for a number", "what is your phone number?"],
    ["leaving the platform", "let us finish this outside the platform"],
    ["Arabic leaving the platform", "نكمل بره المنصة"],
  ])("holds %s for review", (_label, text) => {
    expect(checkText(text).verdict).toBe("hold");
  });
});

describe("ordinary talk about parts is delivered", () => {
  it.each([
    "Is the 16 cc/rev pump in stock?",
    "I need 20 pieces at 3,200 EGP each",
    "Bore 63 mm, rod 36 mm, stroke 400 mm",
    "Dimensions 25 × 52 × 15 mm",
    "50 x 90 x 21.75 mm, is that right?",
    "Max pressure 250 bar at 1450 rpm, 24 V DC coil",
    "Order MK-7F8W26, waybill MKW-PQG7RZJ7",
    "Part number HV-DC-4306 or MB-TR-30210",
    "Bearing 6205 2RS, do you also have 6206?",
    "Can you deliver by 17/11/2026?",
    "Delivery in 3 to 5 days. Me too, thanks.",
    "The valve leaks at the A port. Coil is fine.",
    "Signal pressure is 12 bar on the pilot line",
    "Thread is G1/2, flange is SAE 3000 psi",
    "Total 12,750 EGP for one unit",
    "هل المضخة ١٦ سم متاحة؟",
    "عايز ٢٠ قطعة بسعر ٣٢٠٠ جنيه",
    "القطر ٦٣ مم والشوط ٤٠٠ مم",
    "محتاج واحد بس، وممكن اتنين الشهر الجاي",
    "التسليم خلال ٣ ايام",
    "ضغط التشغيل ٢٥٠ بار",
  ])("%s", (text) => {
    const r = checkText(text);
    expect(r, JSON.stringify(r)).toEqual({ verdict: "clean", reasons: [] });
  });
});

describe("normalisation", () => {
  it("folds digits of other scripts and removes invisible characters", () => {
    expect(normalise("٠١٢۳۴۵６７８９")).toBe("0123456789");
    expect(normalise("a​b‍c﻿")).toBe("abc");
    expect(normalise("أإآ ى ة")).toBe("ااا ي ه");
  });
});

describe("listing text", () => {
  it("flags a listing that carries contact details in any field", () => {
    expect(checkListing(["Gear pump 16 cc", "مضخة ترسية", "Call 01000000123 for a better price"]).verdict).toBe("block");
    expect(checkListing(["Gear pump 16 cc", "مضخة ترسية", "", null, "Shaft = sample.person@example.com"]).verdict).toBe("block");
  });
  it("passes a normal listing", () => {
    expect(checkListing(["Hydraulic gear pump, 16 cc/rev", "مضخة ترسية هيدروليكية 16 سم³/لفة", "HP-GP-0163", "Displacement = 16 cc/rev\nMax pressure = 250 bar"]).verdict).toBe("clean");
  });
});
