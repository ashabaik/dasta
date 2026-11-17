import { asLocale, getDict } from "@/lib/i18n";
import { IconCart, IconGear, IconStore, IconUserPlus } from "@/components/ui";
import { demoSignIn } from "../actions";

type Search = Record<string, string | string[] | undefined>;

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const error = (await searchParams).error;
  const options = [
    { role: "buyer", Icon: IconCart, tone: "bg-steel", ...t.signin.buyer },
    { role: "seller", Icon: IconStore, tone: "bg-accent", ...t.signin.seller },
    { role: "admin", Icon: IconGear, tone: "bg-navy", ...t.signin.admin },
    { role: "new-seller", Icon: IconUserPlus, tone: "bg-ok", ...t.signin.newSeller },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mt-9 text-3xl font-bold">{t.signin.title}</h1>
      <p className="mt-2 text-lg text-muted">{t.signin.lead}</p>
      {error ? <p className="error mt-4">{error === "busy" ? t.signin.busy : t.signin.failed}</p> : null}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <form key={o.role} action={demoSignIn} className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`absolute inset-x-0 top-0 h-1.5 ${o.tone}`} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="role" value={o.role} />
            <div className="flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${o.tone}`}>
                <o.Icon size={24} />
              </span>
              <div>
                <h2 className="text-xl font-semibold">{o.title}</h2>
                <p className="mt-1 text-sm text-muted">{o.desc}</p>
              </div>
            </div>
            <button type="submit" className={`btn mt-auto self-start ${o.role === "new-seller" ? "btn-ghost" : "btn-dark"}`} data-testid={`signin-${o.role}`}>
              {t.signin.go}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const p = await params;
  const t = getDict(asLocale(p.locale));
  return { title: t.titles.signin };
}
