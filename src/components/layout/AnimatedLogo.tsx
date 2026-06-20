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

const DURATION = 700; // ms for the whole fly-out-and-back
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
      const lr = box.getBoundingClientRect();
      const w = b.w * lr.width; // ball size in the header logo
      const h = b.h * lr.height;
      const ocx = lr.left + b.cx * lr.width;
      const ocy = lr.top + b.cy * lr.height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scx = vw / 2;
      const scy = vh / 2;
      // Grow the real ball image to ~0.85 of the SHORT viewport side: big and
      // fully on-screen, but a far gentler upscale than filling (the old code
      // used 1.55x the long side, which is what pixelated it). The white veil
      // blanks the rest of the screen.
      const fullScale = (Math.min(vw, vh) * 0.85) / w;

      fullImg.style.opacity = "0";
      noImg.style.opacity = "1";
      fly.style.left = `${ocx - w / 2}px`;
      fly.style.top = `${ocy - h / 2}px`;
      fly.style.width = `${w}px`;
      fly.style.height = `${h}px`;
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
        const g = p <= 0.5 ? ease(p / 0.5) : ease((1 - p) / 0.5);
        // Ball flies from the header (g=0) to centre (g=1) and back.
        const tx = (scx - ocx) * g;
        const ty = (scy - ocy) * g;
        const win = Math.min(Math.max((p - 0.4) / 0.2, 0), 1);
        const pop = Math.sin(win * Math.PI);
        const scale = (1 + g * (fullScale - 1)) * (1 + 0.08 * pop);
        const rot = SPIN ? p * 360 : 0;
        fly.style.transform = `translate(${tx}px,${ty}px) scale(${scale}) rotate(${rot}deg)`;
        curImg.style.opacity = String(1 - win);
        tgtImg.style.opacity = String(win);
        // Veil ramps to a full-opacity blank with a short plateau around the
        // midpoint, masking the page swap.
        let vp = (0.5 - Math.abs(p - 0.5)) / 0.18;
        if (vp < 0) vp = 0;
        if (vp > 1) vp = 1;
        veil.style.opacity = String(vp);
        // Navigate once while the screen is fully blank, so the new page renders
        // hidden and is revealed as the ball lands and the veil fades.
        if (!navigatedRef.current && p >= 0.5) {
          navigatedRef.current = true;
          setDisplaySport(target);
          router.push(url);
        }
        if (p >= 1) {
          fullImg.style.opacity = "1";
          noImg.style.opacity = "0";
          fly.style.opacity = "0";
          fly.style.transform = "none";
          veil.style.opacity = "0";
          animatingRef.current = false;
          return;
        }
        requestAnimationFrame(tick);
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
                background: "#fff",
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
