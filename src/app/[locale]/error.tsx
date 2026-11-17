"use client";

import { useParams } from "next/navigation";

// Shown when a page fails to render. It never shows the error itself: database messages and stack
// traces stay on the server.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ar = useParams()?.locale === "ar";
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-2xl font-semibold">{ar ? "حدث خطأ" : "Something went wrong"}</h1>
      <p className="mt-2 text-muted">{ar ? "تعذّر عرض الصفحة. لم يتغير شيء." : "The page could not be shown. Nothing was changed."}</p>
      <button type="button" onClick={() => reset()} className="btn btn-ghost mt-6">
        {ar ? "حاول مرة أخرى" : "Try again"}
      </button>
    </div>
  );
}
