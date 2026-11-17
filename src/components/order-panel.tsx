"use client";

import { useState } from "react";
import { MessageSquare, Minus, Plus } from "lucide-react";
import { formatMoney, formatQty } from "@/lib/format";
import { Button } from "@/components/shadcn/button";
import { unitPriceFor, type PriceBreak } from "@/components/ui";

type Labels = {
  priceBreaks: string;
  priceBreaksHint: string;
  quantity: string;
  decrease: string;
  increase: string;
  order: string;
  message: string;
  currency: string;
  unit: string;
  moq: string;
};

/**
 * Price breaks, quantity and the order button. The total shown here is a preview: the database works
 * out the price again from the listing when the order is placed (see buyer_create_order).
 * Without JavaScript the quantity field and the button still work; only the live total is missing.
 */
export function OrderPanel({
  productRef,
  locale,
  base,
  breaks,
  moq,
  stock,
  labels,
  createOrder,
  openThread,
  canOrder,
}: {
  productRef: string;
  locale: string;
  base: number;
  breaks: PriceBreak[];
  moq: number;
  stock: number;
  labels: Labels;
  createOrder: (formData: FormData) => void | Promise<void>;
  openThread: (formData: FormData) => void | Promise<void>;
  canOrder: boolean;
}) {
  const max = Math.min(stock, 100000);
  const [qty, setQty] = useState(moq);
  const clamp = (n: number) => Math.min(max, Math.max(moq, Math.round(n) || moq));
  const step = Math.max(1, Math.round(moq / 10));
  const tiers = [{ qty: moq, price_piastres: base }, ...breaks];
  const unit = unitPriceFor(base, breaks, qty);
  const total = unit * qty;

  return (
    <>
      {/* Price breaks as choices: picking one sets the quantity that reaches it. */}
      <fieldset>
        <legend className="text-[15px] font-semibold">{labels.priceBreaks}</legend>
        <p className="mb-2.5 text-sm text-muted-foreground">{labels.priceBreaksHint}</p>
        <div className="grid grid-cols-3 gap-2.5">
          {tiers.map((tier) => {
            const active = unit === tier.price_piastres;
            return (
              <button
                key={tier.qty}
                type="button"
                aria-pressed={active}
                disabled={tier.qty > max}
                onClick={() => {
                  // Already inside this break: keep the typed quantity. Otherwise jump to the quantity that reaches it.
                  if (!active) setQty(clamp(tier.qty));
                }}
                className={`cursor-pointer rounded-2xl p-3.5 text-center transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
              >
                <span className={`block text-[13px] ${active ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                  <span className="num">{formatQty(tier.qty)}</span>+
                </span>
                <span className="mt-0.5 block text-[20px] font-semibold">
                  <span className="num">{formatMoney(tier.price_piastres)}</span> <span className="text-[13px] font-normal">{labels.currency}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {canOrder ? (
        <form id="order-form" action={createOrder} className="rounded-[22px] bg-card p-4 sm:p-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="ref" value={productRef} />
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="o-qty" className="text-[15px] font-medium">
              {labels.quantity} <span className="text-muted-foreground">({labels.unit})</span>
              <span className="block text-sm font-normal text-muted-foreground">
                {labels.moq} <span className="num">{formatQty(moq)}</span>
              </span>
            </label>
            <div className="flex h-12 items-center rounded-full border border-input bg-background">
              <button type="button" onClick={() => setQty(clamp(qty - step))} className="grid size-12 cursor-pointer place-items-center rounded-full transition-colors duration-200 hover:bg-muted active:bg-accent" aria-label={labels.decrease}>
                <Minus className="size-4" />
              </button>
              <input
                id="o-qty"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={moq}
                max={max}
                value={qty}
                onChange={(e) => setQty(Number.parseInt(e.target.value, 10) || 0)}
                onBlur={() => setQty(clamp(qty))}
                required
                className="num h-full w-20 bg-transparent text-center text-base font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button type="button" onClick={() => setQty(clamp(qty + step))} className="grid size-12 cursor-pointer place-items-center rounded-full transition-colors duration-200 hover:bg-muted active:bg-accent" aria-label={labels.increase}>
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <Button type="submit" size="md" className="mt-4 w-full" data-testid="order-now">
            {labels.order} <span className="num">{formatMoney(total)}</span> {labels.currency}
          </Button>
        </form>
      ) : null}

      {canOrder ? (
        <form action={openThread}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="ref" value={productRef} />
          <Button type="submit" variant="outline" size="md" className="w-full" data-testid="message-seller">
            <MessageSquare aria-hidden="true" />
            {labels.message}
          </Button>
        </form>
      ) : null}
    </>
  );
}
