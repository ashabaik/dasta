"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Keeps an open conversation up to date. It listens for changes to this thread's messages over
 * Supabase Realtime and asks the server to render the page again. The messages themselves always come
 * from the server render, so the same row level security applies; Realtime only tells this page that
 * something it is allowed to see has changed. A slow timer is the fallback when the socket is down.
 */
export function ThreadLive({ threadId, scrollKey }: { threadId: string; scrollKey: number }) {
  const router = useRouter();
  const end = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // The socket must carry the visitor's own session before it joins. Without it Realtime sees an
      // anonymous visitor, who has no right to read messages, and refuses the subscription.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`thread-${threadId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, () => router.refresh())
        .subscribe();
    })();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [threadId, router]);

  // Scroll to the newest message when the number of messages changes.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [scrollKey]);

  return <span ref={end} />;
}
