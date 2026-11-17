import Link from "next/link";
import { ViewTransition } from "react";
import { ChevronRight, ShieldCheck, Store, Truck } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { asLang, dict } from "@/mockups/data";
import { BASE, Footer, Header, TabBar } from "@/mockups/ab";

// Sign-in is a working screen: a plain form, and beside it the honest shortcut. The sample accounts
// live here and nowhere else, and the page says in plain words what they are.
export default async function SignInAB({ params }: { params: Promise<{ lang: string }> }) {
  const lang = asLang((await params).lang);
  const t = dict(lang);
  const accounts = [
    { Icon: Truck, title: t.buyerAcc, text: t.buyerAccText, href: `${BASE}/${lang}` },
    { Icon: Store, title: t.supplierAcc, text: t.supplierAccText, href: `${BASE}/${lang}/dashboard` },
    { Icon: ShieldCheck, title: t.adminAcc, text: t.adminAccText, href: `${BASE}/${lang}/dashboard` },
  ];

  return (
    <>
      <Header lang={lang} t={t} path="/signin" />
      <ViewTransition>
        <main className="mx-auto grid max-w-[1040px] gap-x-16 gap-y-12 px-4 pt-6 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
          <section>
            <h1 className="font-heading text-[32px] font-bold tracking-tight sm:text-[44px] rtl:leading-[1.4]">{t.signInTitle}</h1>
            <form className="mt-7 space-y-5">
              <div>
                <label htmlFor="si-email" className="mb-1.5 block text-[15px] font-medium">
                  {t.email}
                </label>
                <Input id="si-email" type="email" autoComplete="email" dir="ltr" className="h-12 rounded-xl border-input bg-background px-4 text-base shadow-none" />
              </div>
              <div>
                <label htmlFor="si-password" className="mb-1.5 block text-[15px] font-medium">
                  {t.password}
                </label>
                <Input id="si-password" type="password" autoComplete="current-password" dir="ltr" className="h-12 rounded-xl border-input bg-background px-4 text-base shadow-none" />
              </div>
              <Button type="submit" className="h-12 w-full rounded-full text-base">
                {t.signIn}
              </Button>
            </form>
            <p className="mt-5 text-muted-foreground">
              {t.newHere}{" "}
              <Link href={`${BASE}/${lang}/signin`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
                {t.createAccount}
              </Link>
            </p>
          </section>

          <section className="rounded-[26px] bg-card p-5 sm:p-7 lg:self-start" aria-labelledby="si-sample">
            <h2 id="si-sample" className="font-heading text-[22px] font-bold leading-[1.2] tracking-tight sm:text-[26px] rtl:leading-[1.4]">
              {t.sampleTitle}
            </h2>
            <p className="mt-2 max-w-[46ch] text-muted-foreground">{t.sampleText}</p>
            <ul className="mt-5 space-y-2.5">
              {accounts.map(({ Icon, title, text, href }) => (
                <li key={title}>
                  <Link href={href} className="flex items-center gap-4 rounded-2xl bg-background p-4 transition-colors duration-200 hover:bg-accent">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-muted-foreground">{text}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </ViewTransition>
      <Footer lang={lang} t={t} path="/signin" />
      <TabBar lang={lang} t={t} active="account" />
    </>
  );
}
