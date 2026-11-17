import { Plus } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { asLang, byId, dict, money, name, orders } from "@/mockups/data";
import { Footer, Header } from "@/mockups/c";

// The status is always written out; the square beside it only repeats it.
const SQUARE: Record<string, string> = {
  awaiting: "bg-accent ring-1 ring-inset ring-foreground",
  shipped: "ring-2 ring-inset ring-foreground",
  completed: "bg-foreground",
  refunded: "bg-input",
};

export default async function DashboardC({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const ar = lang === "ar";
  const figures = [
    { label: t.awaiting, value: "1", suffix: "" },
    { label: t.protectedBal, value: money(18728), suffix: t.egp },
    { label: t.ready, value: money(21114), suffix: t.egp },
  ];

  return (
    <>
      <Header lang={lang} t={t} path="/dashboard" />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <p className="pt-7 text-[15px] text-muted-foreground sm:pt-10">
          {t.dashboard} · <span className="num">SP-2041</span>
        </p>
        <h1 className={`mt-1 font-heading font-black ${ar ? "text-[40px] leading-[1.35] sm:text-[64px]" : "text-[48px] uppercase leading-[0.95] sm:text-[84px]"}`}>{t.hello}</h1>

        <dl className="mt-7 grid border-y-2 border-foreground md:grid-cols-3">
          {figures.map(({ label, value, suffix }, i) => (
            <div key={label} className={`flex flex-col-reverse py-5 md:py-7 ${i > 0 ? "border-t border-input md:border-s md:border-t-0 md:ps-6 lg:ps-8" : ""}`}>
              <dd className="mt-2 leading-none">
                <span className="cond num font-heading text-[60px] font-black leading-none md:text-[52px] lg:text-[72px]">{value}</span>
                {suffix ? <span className="ms-2 text-[17px] text-muted-foreground">{suffix}</span> : null}
              </dd>
              <dt className="text-[16px]">
                {i === 0 ? <span className="mark font-semibold">{label}</span> : label}
              </dt>
            </div>
          ))}
        </dl>

        <section className="flex flex-wrap items-center justify-between gap-5 border-b border-input py-6">
          <div>
            <h2 className="font-heading text-[24px] font-black ltr:uppercase">
              {t.listings} <span className="num">7</span> {t.ofTen}
            </h2>
            <div className="mt-3 flex gap-1.5" role="img" aria-label={`7 ${t.ofTen}`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`size-7 sm:size-8 ${i < 7 ? "bg-foreground" : "ring-2 ring-inset ring-muted-foreground"}`} />
              ))}
            </div>
          </div>
          <Button className="h-12 rounded-none px-5 text-[16px]">
            <Plus className="size-[18px]" aria-hidden="true" />
            {t.addListing}
          </Button>
        </section>

        <section className="pt-10">
          <h2 className="border-b-2 border-foreground pb-3 font-heading text-[32px] font-black leading-none ltr:uppercase sm:text-[46px] rtl:leading-[1.3]">{t.recent}</h2>
          <Table className="text-[16px]">
            <TableHeader>
              <TableRow className="border-input hover:bg-transparent">
                <TableHead className="h-11 px-0 text-start text-sm font-medium text-muted-foreground">{t.order}</TableHead>
                <TableHead className="hidden h-11 px-3 text-end text-sm font-medium text-muted-foreground sm:table-cell">{t.quantity}</TableHead>
                <TableHead className="h-11 px-3 text-end text-sm font-medium text-muted-foreground">{t.total}</TableHead>
                <TableHead className="hidden h-11 px-3 text-start text-sm font-medium text-muted-foreground sm:table-cell">{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const item = byId(o.item);
                const status = (
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-2">
                      <span className={`size-3 shrink-0 ${SQUARE[o.status]}`} aria-hidden="true" />
                      {t.st[o.status]}
                    </span>
                    {o.status === "awaiting" ? <Button className="h-11 rounded-none px-4 text-[15px]">{t.ship}</Button> : null}
                  </span>
                );
                return (
                  <TableRow key={o.no} className="border-input hover:bg-muted">
                    <TableCell className="whitespace-normal px-0 py-4">
                      <span className="flex items-center gap-3.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.img} alt="" className="hidden size-14 shrink-0 bg-muted object-cover sm:block" />
                        <span className="min-w-0">
                          <span className="block font-semibold leading-snug">{name(item, lang)}</span>
                          <span className="block text-sm text-muted-foreground">
                            <span className="num">{o.no}</span> · <span className="num">{o.buyer}</span>
                          </span>
                          {/* On a phone the status sits under the order instead of in its own column. */}
                          <span className="mt-2 block sm:hidden">{status}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden px-3 py-4 text-end sm:table-cell">
                      <span className="num">{money(o.qty)}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-end font-semibold">
                      <span className="num">{money(o.total)}</span>
                    </TableCell>
                    <TableCell className="hidden whitespace-normal px-3 py-4 sm:table-cell">{status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      </main>
      <Footer lang={lang} t={t} />
    </>
  );
}
