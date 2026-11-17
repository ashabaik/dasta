import { ChevronRight, ShieldCheck, Store, Truck } from "lucide-react";
import { asLocale, getDict } from "@/lib/i18n";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { passwordSignIn, sampleSignIn } from "../actions";

type Search = Record<string, string | string[] | undefined>;

// Sign-in is a working screen: a plain form, and beside it the honest shortcut. The sample accounts
// live here and nowhere else, and the page says in plain words what they are.
export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const s = t.signin;
  const error = String((await searchParams).error ?? "");
  const accounts = [
    { role: "buyer", Icon: Truck, ...s.buyer },
    { role: "seller", Icon: Store, ...s.seller },
    { role: "admin", Icon: ShieldCheck, ...s.admin },
  ];

  return (
    <div className="mx-auto grid max-w-[1040px] gap-x-16 gap-y-12 pt-6 lg:grid-cols-[1fr_1.05fr] lg:pt-12">
      <section>
        <h1 className="font-heading text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[44px] rtl:leading-[1.4]">{s.title}</h1>
        {error ? <p className="error mt-5">{error === "busy" ? s.busy : error === "wrong" ? s.wrong : s.failed}</p> : null}
        <form action={passwordSignIn} className="mt-7 space-y-5">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label htmlFor="si-email" className="label">
              {s.email}
            </label>
            <Input id="si-email" name="email" type="email" autoComplete="email" dir="ltr" required />
          </div>
          <div>
            <label htmlFor="si-password" className="label">
              {s.password}
            </label>
            <Input id="si-password" name="password" type="password" autoComplete="current-password" dir="ltr" required />
          </div>
          <Button type="submit" size="md" className="w-full">
            {s.submit}
          </Button>
        </form>

        <form id="supplier" action={sampleSignIn} className="mt-8 scroll-mt-28 border-t border-border pt-6">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="role" value="new-seller" />
          <p className="font-medium">{s.newHere}</p>
          <p className="mt-1 max-w-[46ch] text-[15px] text-muted-foreground">{s.openSupplierHint}</p>
          <Button type="submit" variant="outline" className="mt-4" data-testid="signin-new-seller">
            {s.openSupplier}
          </Button>
        </form>
      </section>

      <section className="rounded-[26px] bg-card p-5 sm:p-7 lg:self-start" aria-labelledby="si-sample">
        <h2 id="si-sample" className="font-heading text-[22px] font-bold leading-[1.2] tracking-tight sm:text-[26px] rtl:leading-[1.4]">
          {s.sampleTitle}
        </h2>
        <p className="mt-2 max-w-[46ch] text-muted-foreground">{s.sampleText}</p>
        <ul className="mt-5 space-y-2.5">
          {accounts.map(({ role, Icon, title, desc }) => (
            <li key={role}>
              <form action={sampleSignIn}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="role" value={role} />
                <button type="submit" className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-background p-4 text-start transition-colors duration-200 hover:bg-accent" data-testid={`signin-${role}`}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{desc}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.signin };
}
