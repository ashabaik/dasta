"use client";

import { useEffect, useLayoutEffect } from "react";
import "lenis/dist/lenis.css";

declare global {
  interface Window {
    __dastaMotion?: boolean;
  }
}

const DESKTOP = "(min-width: 1024px) and (pointer: fine)";

/**
 * The home page's motion layer. The page is complete without it: this only directs what is already there.
 *
 *   Opening shot      photograph first, then the headline, then the supporting line and the actions
 *   Signature scene   on a desktop the category row is held and travels sideways with the scroll
 *   Supporting        slow parallax on the hero photograph, product photographs uncover once,
 *                     the closing line rises once
 *
 * Two choreographies, not one made smaller:
 *   - Phones and touch screens: the opening and the one-time reveals are plain CSS (see globals.css);
 *     this component only tells the stylesheet when something has scrolled into view. No animation
 *     library is downloaded, no smooth-scroll layer, nothing held.
 *   - Desktop: GSAP (ScrollTrigger, SplitText) and Lenis are loaded after the first paint for the
 *     line-by-line headline, the parallax and the held scene.
 *
 * Nothing runs for visitors who prefer reduced motion: neither the inline gate in the layout nor this
 * component adds `has-motion` for them. Text is split by lines, never by letters, so Arabic stays joined, and sideways
 * travel is mirrored in right-to-left.
 */
export function HomeMotion() {
  // Arriving from another page (no fresh document, so the inline gate did not run for this page):
  // put the opening states in place before the first paint of the home page.
  useLayoutEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("has-motion");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("has-motion")) return;
    window.__dastaMotion = true;
    let cancelled = false;
    const undo: (() => void)[] = [];

    // One-time reveals, for every screen: mark what has come into view; the stylesheet does the rest.
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-photo-reveal], [data-closing-text], [data-closing-fade]").forEach((el) => seen.observe(el));
    undo.push(() => seen.disconnect());

    const desktop = window.matchMedia(DESKTOP);
    const startDesktop = async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }, { default: Lenis }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText"), import("lenis")]);
      if (cancelled || !desktop.matches) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const rtl = root.dir === "rtl";
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (!hero) return;

      const ctx = gsap.context(() => {
        // Opening shot. Built paused and started once the photograph is there and the setup work is over,
        // so a busy first second cannot swallow it.
        gsap.set("[data-hero-fade]", { y: 18 });
        const opening = gsap.timeline({ paused: true, defaults: { ease: "power3.out" }, onComplete: () => gsap.ticker.lagSmoothing(0) });
        opening
          .fromTo("[data-hero-media]", { clipPath: "inset(9% 9% 9% 9% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.3, ease: "expo.out" }, 0)
          .fromTo("[data-hero-img]", { scale: 1.16 }, { scale: 1, duration: 1.7 }, 0)
          .to("[data-hero-fade]", { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0.65);
        let headline: gsap.core.Tween | undefined;
        let started = false;
        SplitText.create("[data-hero-text]", {
          type: "lines",
          mask: "lines",
          linesClass: "sl",
          autoSplit: true,
          onSplit(self: { lines: Element[] }) {
            gsap.set("[data-hero-text]", { visibility: "visible" });
            headline = gsap.from(self.lines, { yPercent: 112, duration: 1, ease: "power4.out", stagger: 0.11, delay: 0.2, paused: !started });
            return headline;
          },
        });
        const start = () => {
          if (started) return;
          started = true;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              opening.play();
              headline?.play();
            }),
          );
        };
        const heroImg = document.querySelector<HTMLImageElement>("[data-hero-img]");
        const wait = window.setTimeout(start, 700); // never wait long for the photograph
        if (!heroImg || (heroImg.complete && heroImg.naturalWidth > 0)) start();
        else heroImg.addEventListener("load", start, { once: true });
        undo.push(() => window.clearTimeout(wait));

        // The closing line rises line by line, when the page has lifted far enough to show it.
        SplitText.create("[data-closing-text]", {
          type: "lines",
          mask: "lines",
          linesClass: "sl",
          autoSplit: true,
          onSplit(self: { lines: Element[] }) {
            gsap.set("[data-closing-text]", { visibility: "visible" });
            return gsap.from(self.lines, { yPercent: 112, duration: 1, ease: "power4.out", stagger: 0.11, scrollTrigger: { trigger: "[data-curtain-end]", start: "top 72%", once: true } });
          },
        });
        gsap.fromTo("[data-closing-fade]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, delay: 0.45, scrollTrigger: { trigger: "[data-curtain-end]", start: "top 72%", once: true } });

        // Slow parallax: the photograph drifts a little while the first screen leaves.
        gsap.to("[data-hero-parallax]", { yPercent: 4.5, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      });

      // Smooth scrolling, only here where scroll-driven scenes exist. It runs from GSAP's ticker and
      // reports every scroll to ScrollTrigger, which keeps the held scene from stuttering.
      const lenis = new Lenis({ lerp: 0.1, anchors: true, autoRaf: false });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);

      // Signature scene: the category row is held and travels sideways with the scroll.
      const scene = document.querySelector<HTMLElement>("[data-cat-scene]");
      const track = scene?.querySelector<HTMLElement>("[data-cat-track]");
      let onFocus: ((event: FocusEvent) => void) | undefined;
      if (scene && track) {
        scene.classList.add("is-held");
        ctx.add(() => {
          const travel = () => Math.max(0, track.scrollWidth - scene.clientWidth + window.innerWidth * 0.06);
          const tween = gsap.to(track, {
            x: () => (rtl ? travel() : -travel()), // mirrored in right-to-left
            ease: "none",
            scrollTrigger: { trigger: scene, start: "top top", end: () => `+=${travel()}`, scrub: 0.9, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
          });
          // Keyboard: when focus lands on a category that is off screen, scroll the scene to it.
          onFocus = (event: FocusEvent) => {
            const el = event.target as HTMLElement;
            const st = tween.scrollTrigger;
            if (!st || !track.contains(el)) return;
            const a = el.getBoundingClientRect();
            const b = track.getBoundingClientRect();
            const centre = (rtl ? b.right - a.right : a.left - b.left) + a.width / 2;
            const progress = Math.min(1, Math.max(0, (centre - window.innerWidth / 2) / travel()));
            lenis.scrollTo(st.start + progress * (st.end - st.start), { duration: 0.6 });
          };
          track.addEventListener("focusin", onFocus);
        });
      }
      document.fonts?.ready.then(() => !cancelled && ScrollTrigger.refresh());

      undo.push(() => {
        if (onFocus) track?.removeEventListener("focusin", onFocus);
        scene?.classList.remove("is-held");
        gsap.ticker.remove(raf);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        ctx.revert();
      });
    };
    if (desktop.matches) void startDesktop();

    return () => {
      cancelled = true;
      undo.forEach((fn) => fn());
    };
  }, []);

  return null;
}
