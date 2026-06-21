"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sport, useLogoAnimation } from "./LogoAnimationContext";

const LOGO: Record<Sport, string> = {
  basketball: "/images/anim/logo_basketball.png",
  football: "/images/anim/logo_football.png",
};
const BALL: Record<Sport, string> = {
  basketball: "/images/anim/ball_basketball.png",
  football: "/images/anim/ball_football.png",
};
const NOBALL = "/images/anim/logo_noball.png";

// Ball centre/size as fractions of the 2.5-aspect logo box, per sport.
const BOX: Record<Sport, { cx: number; cy: number; w: number; h: number }> = {
  basketball: { cx: 1835 / 3125, cy: 315 / 1250, w: 534 / 3125, h: 534 / 1250 },
  football: {
    cx: (757 + 259 / 2) / 1500,
    cy: (23 + 250 / 2) / 600,
    w: 259 / 1500,
    h: 250 / 600,
  },
};

const DURATION = 1300; // ms for the whole fly-out-and-back
const SPIN = true;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const imgFill: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  userSelect: "none",
};

export default function AnimatedLogo() {
  const pathname = usePathname();
  const router = useRouter();
  const ctx = useLogoAnimation();

  const currentSport: Sport = pathname.startsWith("/football")
    ? "football"
    : "basketball";
  const [displaySport, setDisplaySport] = useState<Sport>(currentSport);

  const boxRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLImageElement>(null);
  const noballRef = useRef<HTMLImageElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const curBallRef = useRef<HTMLImageElement>(null);
  const tgtBallRef = useRef<HTMLImageElement>(null);
  const animatingRef = useRef(false);
  const navigatedRef = useRef(false);

  // Live pathname-derived sport, so the animation loop can tell when the new
  // route has actually committed before it reveals the page.
  const currentSportRef = useRef(currentSport);
  currentSportRef.current = currentSport;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Preload every asset so nothing flashes mid-animation.
  useEffect(() => {
    [LOGO.basketball, LOGO.football, BALL.basketball, BALL.football, NOBALL].forEach(
      (src) => {
        const i = new window.Image();
        i.src = src;
      },
    );
  }, []);

  // Keep the logo in sync when the sport changes via a plain navigation
  // (back button, direct links) rather than the animation.
  useEffect(() => {
    if (!animatingRef.current) setDisplaySport(currentSport);
  }, [currentSport]);

  const switchTo = useCallback(
    (target: Sport, url: string) => {
      if (animatingRef.current) return;

      const from = displaySport;
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (
        target === from ||
        prefersReduced ||
        !boxRef.current ||
        !fullRef.current ||
        !noballRef.current ||
        !veilRef.current ||
        !flyRef.current ||
        !curBallRef.current ||
        !tgtBallRef.current
      ) {
        router.push(url);
        return;
      }

      const box = boxRef.current;
      const fullImg = fullRef.current;
      const noImg = noballRef.current;
      const veil = veilRef.current;
      const fly = flyRef.current;
      const curImg = curBallRef.current;
      const tgtImg = tgtBallRef.current;

      const b = BOX[from];
      const bt = BOX[target];
      const lr = box.getBoundingClientRect();
      const w = b.w * lr.width; // ball size in the from logo (fly-out scale)
      const wt = bt.w * lr.width; // ball size in the target logo (fly-in scale)
      const ocx = lr.left + b.cx * lr.width;
      const ocy = lr.top + b.cy * lr.height;
      const tcx = lr.left + bt.cx * lr.width; // target ball landing x
      const tcy = lr.top + bt.cy * lr.height; // target ball landing y
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scx = vw / 2;
      const scy = vh / 2;
      const S = 0.85 * Math.min(vw, vh);
      const scaleStart = w / S;
      const scaleEnd = wt / S;

      fullImg.style.opacity = "0";
      noImg.style.opacity = "1";
      veil.style.transition = ""; // clear any leftover reveal fade
      fly.style.left = `${scx - S / 2}px`;
      fly.style.top = `${scy - S / 2}px`;
      fly.style.width = `${S}px`;
      fly.style.height = `${S}px`;
      fly.style.opacity = "1";
      curImg.src = BALL[from];
      curImg.style.opacity = "1";
      tgtImg.src = BALL[target];
      tgtImg.style.opacity = "0";

      animatingRef.current = true;
      navigatedRef.current = false;
      const t0 = performance.now();
      const tick = (now: number) => {
        let p = (now - t0) / DURATION;
        if (p > 1) p = 1;

        // Fly-out (p 0→0.5): ball leaves FROM socket and grows to full size.
        // Fly-in  (p 0.5→1): ball shrinks from full size and lands in TARGET socket.
        // Using separate origin/destination lets the ball land in the right spot.
        let tx: number, ty: number, scale: number;
        if (p <= 0.5) {
          const g = ease(p / 0.5); // 0→1
          tx = (ocx - scx) * (1 - g);
          ty = (ocy - scy) * (1 - g);
          scale = scaleStart + g * (1 - scaleStart);
        } else {
          const g = ease((1 - p) / 0.5); // 1→0
          tx = (tcx - scx) * (1 - g);
          ty = (tcy - scy) * (1 - g);
          scale = scaleEnd + g * (1 - scaleEnd);
        }

        const win = Math.min(Math.max((p - 0.4) / 0.2, 0), 1);
        const pop = Math.sin(win * Math.PI);
        const rot = SPIN ? p * 360 : 0;
        fly.style.transform = `translate(${tx}px,${ty}px) scale(${scale * (1 + 0.08 * pop)}) rotate(${rot}deg)`;
        curImg.style.opacity = String(1 - win);
        tgtImg.style.opacity = String(win);
        // Veil ramps to a fully-opaque blank as the ball grows, then HOLDS.
        // It never fades back during the flight, so the old page can't peek
        // through; it only fades once the new route has committed (below).
        veil.style.opacity = String(Math.min(p / 0.42, 1));
        // Navigate once while the screen is fully blank, so the new page
        // renders hidden behind the veil.
        if (!navigatedRef.current && p >= 0.5) {
          navigatedRef.current = true;
          setDisplaySport(target);
          router.push(url);
        }
        if (p >= 1) {
          // Header now shows the target logo; flying ball is parked. Keep the
          // veil opaque and reveal only once the new route is actually live.
          fullImg.style.opacity = "1";
          noImg.style.opacity = "0";
          fly.style.opacity = "0";
          fly.style.transform = "none";
          revealWhenReady();
          return;
        }
        requestAnimationFrame(tick);
      };

      // Hold the blank until the new page has committed (pathname == target),
      // then give it one frame to paint and fade the veil away. A timeout
      // guards against a navigation that never lands.
      const revealWhenReady = () => {
        const revealStart = performance.now();
        const waitTick = (now: number) => {
          const arrived = currentSportRef.current === target;
          const timedOut = now - revealStart > 1500;
          if (arrived || timedOut) {
            requestAnimationFrame(() => {
              veil.style.transition = "opacity 240ms ease";
              veil.style.opacity = "0";
              window.setTimeout(() => {
                veil.style.transition = "";
                animatingRef.current = false;
              }, 280);
            });
            return;
          }
          requestAnimationFrame(waitTick);
        };
        requestAnimationFrame(waitTick);
      };

      requestAnimationFrame(tick);
    },
    [displaySport, router],
  );

  // Register a stable wrapper that always calls the latest switchTo.
  const switchToRef = useRef(switchTo);
  switchToRef.current = switchTo;
  useEffect(() => {
    if (!ctx) return;
    const stable = (sport: Sport, url: string) => switchToRef.current(sport, url);
    ctx.registerSwitcher(stable);
    return () => ctx.registerSwitcher(null);
  }, [ctx]);

  return (
    <>
      <div
        ref={boxRef}
        style={{
          position: "relative",
          width: 100,
          aspectRatio: "2.5",
          marginTop: 4,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={fullRef}
          src={LOGO[displaySport]}
          alt="JThom Analytics Logo"
          style={imgFill}
          draggable={false}
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={noballRef}
          src={NOBALL}
          alt=""
          aria-hidden="true"
          style={{ ...imgFill, opacity: 0 }}
          draggable={false}
        />
      </div>
      {mounted &&
        createPortal(
          <>
            <div
              ref={veilRef}
              style={{
                position: "fixed",
                inset: 0,
                // Match the page background so the blank respects dark mode.
                background: "var(--bg-primary, #fff)",
                opacity: 0,
                pointerEvents: "none",
                zIndex: 2147483646,
              }}
            />
            <div
              ref={flyRef}
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                opacity: 0,
                pointerEvents: "none",
                zIndex: 2147483647,
                transformOrigin: "center center",
                willChange: "transform, opacity",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={curBallRef}
                alt=""
                aria-hidden="true"
                style={imgFill}
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={tgtBallRef}
                alt=""
                aria-hidden="true"
                style={imgFill}
                draggable={false}
              />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
