import Link from "next/link";

// A not-found page does not receive the locale, so it says the same thing in both languages.
export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-1 text-lg" lang="ar" dir="rtl">
        الصفحة غير موجودة
      </p>
      <p className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/en" className="btn btn-ghost">
          Catalogue
        </Link>
        <Link href="/ar" className="btn btn-ghost" lang="ar">
          الكتالوج
        </Link>
      </p>
    </div>
  );
}
