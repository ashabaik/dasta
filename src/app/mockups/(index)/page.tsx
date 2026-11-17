import Link from "next/link";

// A plain page for choosing between the design directions. Not part of the product.

const directions = [
  {
    key: "a",
    name: "Raff",
    ar: "رفّ",
    meaning: "shelf",
    idea: "A gallery",
    text: "The photograph is the product. Tall images with no boxes around them, serif headings, a white page, sharp corners and one deep green.",
    type: "Instrument Serif with Instrument Sans. Arabic: Markazi Text with Noto Sans Arabic.",
    swatches: ["#ffffff", "#f4f3f0", "#141412", "#1d5a45"],
  },
  {
    key: "b",
    name: "Dasta",
    ar: "دستة",
    meaning: "a dozen",
    idea: "An app",
    text: "Search comes first. Rounded white surfaces on a cool grey ground, one cobalt blue, and on a phone the navigation sits in a bar under the thumb.",
    type: "Bricolage Grotesque with Readex Pro, one family drawn for both Arabic and Latin.",
    swatches: ["#f4f6f9", "#ffffff", "#0c1220", "#1f49e0"],
  },
  {
    key: "c",
    name: "Sanf",
    ar: "صنف",
    meaning: "item, kind",
    idea: "A printed catalogue",
    text: "Products are lines in an index, not cards in a grid. Black on white, condensed heavy headings, real tables, and one saffron highlighter.",
    type: "Archivo (condensed) with IBM Plex Sans. Arabic: Noto Kufi Arabic with IBM Plex Sans Arabic.",
    swatches: ["#ffffff", "#f3f3f1", "#0b0b0b", "#f5c518"],
  },
];

const merged = {
  key: "ab",
  name: "Dasta",
  ar: "دستة",
  swatches: ["#ffffff", "#f5f4f1", "#121512", "#1d5a45"],
};

const pages = [
  { label: "Home", path: "" },
  { label: "Product", path: "/product" },
  { label: "Dashboard", path: "/dashboard" },
];

function Swatches({ colours }: { colours: string[] }) {
  return (
    <ul className="mt-4 flex gap-2" aria-label="Palette">
      {colours.map((c) => (
        <li key={c} className="size-9 rounded-full border border-border" style={{ background: c }}>
          <span className="sr-only">{c}</span>
        </li>
      ))}
    </ul>
  );
}

function PageLinks({ k, name }: { k: string; name: string }) {
  return (
    <table className="mt-6 w-full max-w-[420px] text-[16px]">
      <thead className="sr-only">
        <tr>
          <th>Page</th>
          <th>English</th>
          <th>Arabic</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((pg) => (
          <tr key={pg.label} className="border-t border-border">
            <th scope="row" className="py-1 text-start font-medium">
              {pg.label}
            </th>
            {(["en", "ar"] as const).map((lang) => (
              <td key={lang} className="py-1">
                <Link href={`/mockups/${k}/${lang}${pg.path}`} className="inline-flex min-h-[44px] items-center font-medium text-[#1a4fd6] underline underline-offset-4">
                  {lang === "en" ? "English" : "Arabic"}
                  <span className="sr-only">
                    : {name} {pg.label}
                  </span>
                </Link>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Preview({ k, alt }: { k: string; alt: string }) {
  return (
    <Link href={`/mockups/${k}/en`} className="block self-start overflow-hidden rounded-lg border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/mk/preview/${k}-desk.jpg`} alt={alt} width={1440} height={900} className="block h-auto w-full" />
    </Link>
  );
}

export default function MockupIndex() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8 sm:py-16">
      <h1 className="text-[34px] font-semibold leading-tight tracking-tight sm:text-[44px]">Design directions</h1>
      <p className="mt-3 max-w-[62ch] text-[17px] text-muted-foreground">
        The merged direction comes first; the three it was chosen from are kept below for comparison. Every direction has a home page, a product page and a supplier dashboard, in English and Arabic. Open them on a phone as well as a desktop.
      </p>

      <section className="mt-10 grid gap-6 border-t-2 border-foreground pt-8 md:grid-cols-[1.15fr_1fr] md:gap-10">
        <Preview k={merged.key} alt="Dasta, merged direction: home page on a desktop" />
        <div>
          <p className="text-[15px] text-muted-foreground">Merged direction · built on B, with A&rsquo;s calm</p>
          <h2 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">
            {merged.name}{" "}
            <span lang="ar" dir="rtl" className="font-normal text-muted-foreground">
              {merged.ar}
            </span>
          </h2>
          <p className="mt-4 max-w-[52ch]">
            <span className="font-medium">From B:</span> the header with search in the middle, category chips, heavy headings, the dashboards, the phone tab bar, and price, minimum quantity and supplier code under each product.
          </p>
          <p className="mt-3 max-w-[52ch]">
            <span className="font-medium">From A:</span> tall photographs with no box, border or shadow, more white space, the light hero photograph, and deep green as the only accent.
          </p>
          <p className="mt-3 max-w-[52ch] text-[15px] text-muted-foreground">Type: B&rsquo;s throughout. Bricolage Grotesque with Readex Pro.</p>
          <Swatches colours={merged.swatches} />
          <PageLinks k={merged.key} name="Dasta merged" />
        </div>
      </section>

      <h2 className="mt-20 text-[24px] font-semibold tracking-tight">The first three directions</h2>
      <ol className="mt-6 space-y-14">
        {directions.map((d) => (
          <li key={d.key} className="grid gap-6 border-t border-border pt-8 md:grid-cols-[1.15fr_1fr] md:gap-10">
            <Preview k={d.key} alt={`${d.name}: home page on a desktop`} />
            <div>
              <p className="text-[15px] text-muted-foreground">
                Direction {d.key.toUpperCase()} · {d.idea}
              </p>
              <h3 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight">
                {d.name}{" "}
                <span lang="ar" dir="rtl" className="font-normal text-muted-foreground">
                  {d.ar}
                </span>
              </h3>
              <p className="text-[15px] text-muted-foreground">Arabic for “{d.meaning}”.</p>
              <p className="mt-4 max-w-[52ch]">{d.text}</p>
              <p className="mt-3 max-w-[52ch] text-[15px] text-muted-foreground">Type: {d.type}</p>
              <Swatches colours={d.swatches} />
              <PageLinks k={d.key} name={d.name} />
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-14 max-w-[70ch] border-t border-border pt-6 text-[15px] text-muted-foreground">
        These are static mockups with sample products, suppliers and prices; nothing here is connected to the database yet. The names were checked with a quick web search only, not a trademark search. Photographs are used under the Unsplash Licence.
      </p>
    </main>
  );
}
