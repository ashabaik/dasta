"use client";

import { useActionState } from "react";
import { adminReveal, type RevealState } from "@/app/[locale]/actions";

type Labels = {
  seller: string;
  reason: string;
  reasonPlaceholder: string;
  reveal: string;
  revealed: string;
  fields: Record<string, string>;
  errors: Record<string, string>;
};

/**
 * The admin picks a seller and must type a reason. The identity comes back from the server action
 * straight into this component's state: it is never part of a URL or of a cached page.
 */
export function RevealForm({ locale, sellers, labels }: { locale: string; sellers: { id: string; code: string }[]; labels: Labels }) {
  const [state, action, pending] = useActionState<RevealState, FormData>(adminReveal, {});
  return (
    <div className="space-y-3">
      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(9rem,auto)_1fr_auto] sm:items-end">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label className="label" htmlFor="r-seller">
            {labels.seller}
          </label>
          <select id="r-seller" name="seller_id" className="input code" required>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-reason">
            {labels.reason}
          </label>
          <input id="r-reason" name="reason" className="input" placeholder={labels.reasonPlaceholder} required minLength={10} maxLength={300} />
        </div>
        <button type="submit" className="btn" disabled={pending} data-testid="reveal-submit">
          {labels.reveal}
        </button>
      </form>
      {state.error ? <p className="error">{labels.errors[state.error] ?? labels.errors.generic}</p> : null}
      {state.identity ? (
        <div className="rounded-md border border-held-bg bg-held-bg p-3" data-testid="revealed-identity">
          <h3 className="text-sm font-semibold text-held">
            {labels.revealed} <span className="code">{state.identity.seller_code}</span>
          </h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {Object.entries(labels.fields).map(([key, label]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd dir="ltr" className="text-start">
                  {(state.identity as Record<string, string>)[key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
