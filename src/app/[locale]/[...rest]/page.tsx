import { notFound } from "next/navigation";

// Catches every address that no other page matches, so the visitor gets the site's own
// "page not found" inside the normal layout.
export default function CatchAll() {
  notFound();
}
