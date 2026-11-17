import { asLocale, getDict } from "@/lib/i18n";
import { demoSignIn } from "../actions";

type Search = Record<string, string | string[] | undefined>;

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const locale = asLocale((await params).locale);
  const t = getDict(locale);
  const error = (await searchParams).error;
  const options = [
    { role: "buyer", ...t.signin.buyer },
    { role: "seller", ...t.signin.seller },
    { role: "admin", ...t.signin.admin },
    { role: "new-seller", ...t.signin.newSeller },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mt-8 text-2xl font-semibold">{t.signin.title}</h1>
      <p className="mt-2 text-muted">{t.signin.lead}</p>
      {error ? <p className="error mt-4">{error === "busy" ? t.signin.busy : t.signin.failed}</p> : null}
      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {options.map((o) => (
          <form key={o.role} action={demoSignIn} className="card flex flex-col gap-3">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="role" value={o.role} />
            <div>
              <h2 className="text-lg font-semibold">{o.title}</h2>
              <p className="mt-1 text-sm text-muted">{o.desc}</p>
            </div>
            <button type="submit" className={`btn mt-auto self-start ${o.role === "new-seller" ? "btn-ghost" : ""}`} data-testid={`signin-${o.role}`}>
              {t.signin.go}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
