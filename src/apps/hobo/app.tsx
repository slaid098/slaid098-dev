"use client";

import type { Manifest } from "@/lib/manifest";
import { useEffect, useRef, useState } from "react";
import styles from "./app.module.css";

export default function HoboApp({ manifest }: { manifest: Manifest }) {
  const [clicks, setClicks] = useState<number>(0);
  const [isScreaming, setIsScreaming] = useState<boolean>(false);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [floatingOres, setFloatingOres] = useState<{ id: number; x: number; y: number }[]>([]);
  const oreIdRef = useRef<number>(0);

  const screamCtxRef = useRef<AudioContext | null>(null);
  const screamBufRef = useRef<AudioBuffer | null>(null);
  const explosionBufRef = useRef<AudioBuffer | null>(null);

  const EXPLOSION_THRESHOLD = 10;
  const EXPLOSION_DURATION = 5000;

  useEffect(() => {
    const saved = localStorage.getItem(`clicker_${manifest.slug}_count`);
    if (saved) {
      setClicks(Number.parseInt(saved, 10) || 0);
    }
  }, [manifest.slug]);

  useEffect(() => {
    const img = new Image();
    img.src = `/apps/${manifest.slug}/assets/hobo-scream.png`;
  }, [manifest.slug]);

  useEffect(() => {
    let active = true;
    const loadAudio = async () => {
      try {
        const AudioContextClass =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        screamCtxRef.current = ctx;

        const [screamRes, explosionRes] = await Promise.all([
          fetch(`/apps/${manifest.slug}/assets/scream.mp3`),
          fetch(`/apps/${manifest.slug}/assets/explosion.mp3`),
        ]);

        if (!screamRes.ok) throw new Error("Failed to load scream.mp3");
        if (!explosionRes.ok) throw new Error("Failed to load explosion.mp3");

        const [screamAB, explosionAB] = await Promise.all([
          screamRes.arrayBuffer(),
          explosionRes.arrayBuffer(),
        ]);

        if (active) {
          screamBufRef.current = await ctx.decodeAudioData(screamAB);
          explosionBufRef.current = await ctx.decodeAudioData(explosionAB);
        }
      } catch (err) {
        console.error("Failed to load audio:", err);
      }
    };
    loadAudio();
    return () => {
      active = false;
      if (screamCtxRef.current) {
        screamCtxRef.current.close().catch(() => {});
      }
    };
  }, [manifest.slug]);

  function playBuffer(buf: AudioBuffer | null) {
    const ctx = screamCtxRef.current;
    if (ctx && buf) {
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.start(0);
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isExploded) return;

    if (clicks + 1 >= EXPLOSION_THRESHOLD) {
      setIsExploded(true);
      playBuffer(explosionBufRef.current);
      setTimeout(() => {
        setClicks(0);
        setIsExploded(false);
        localStorage.setItem(`clicker_${manifest.slug}_count`, "0");
      }, EXPLOSION_DURATION);
      return;
    }

    playBuffer(screamBufRef.current);

    const newCount = clicks + 1;
    setClicks(newCount);
    localStorage.setItem(`clicker_${manifest.slug}_count`, newCount.toString());

    setIsScreaming(true);
    setTimeout(() => setIsScreaming(false), 350);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newId = oreIdRef.current++;
    setFloatingOres((prev) => [...prev, { id: newId, x, y }]);

    setTimeout(() => {
      setFloatingOres((prev) => prev.filter((o) => o.id !== newId));
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const syntheticEvent = {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        currentTarget: e.currentTarget,
      } as React.MouseEvent<HTMLButtonElement>;
      handleClick(syntheticEvent);
    }
  };

  return (
    <div className="flex flex-col items-center select-none py-12">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Нажми на ${manifest.title}, чтобы заставить его орать`}
        className="relative cursor-pointer max-w-[320px] w-full aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background p-0 overflow-visible"
      >
        {floatingOres.map((ore) => (
          <span
            key={ore.id}
            className={`absolute font-mono font-bold text-accent text-3xl pointer-events-none ${styles.floatOre}`}
            style={{ left: ore.x, top: ore.y - 20, zIndex: 20 }}
          >
            ОР!
          </span>
        ))}

        {isExploded ? (
          <div className={`absolute inset-0 flex items-center justify-center ${styles.explosion}`}>
            <span className="text-8xl">💥</span>
            <span className={`absolute text-6xl ${styles.particle} ${styles.p1}`}>🔥</span>
            <span className={`absolute text-5xl ${styles.particle} ${styles.p2}`}>💫</span>
            <span className={`absolute text-4xl ${styles.particle} ${styles.p3}`}>✨</span>
            <span className={`absolute text-3xl ${styles.particle} ${styles.p4}`}>💀</span>
          </div>
        ) : (
          <div
            className={`w-full h-full transition duration-75 ${
              isScreaming ? `scale-[1.12] rotate-1 ${styles.shake}` : "hover:scale-[1.02]"
            }`}
            style={{ zIndex: 10 }}
          >
            <img
              src={`/apps/${manifest.slug}/assets/${isScreaming ? "hobo-scream" : "hobo-regular"}.png`}
              alt={manifest.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}
      </button>

      {!isExploded && (
        <div className="mt-8 text-center">
          <span className="font-mono text-xs text-muted block uppercase tracking-wider">
            всего оров
          </span>
          <span className="text-5xl font-extrabold tracking-tight text-accent block mt-1 font-mono">
            {clicks}
          </span>
          <span className="text-xs text-muted block mt-4 max-w-[240px] px-4">
            жми на бомжа, чтобы заставить его орать
          </span>
        </div>
      )}

      {isExploded && (
        <div className="mt-8 text-center animate-pulse">
          <span className="text-lg font-bold text-accent">БОМЖ ВЗОРВАЛСЯ!</span>
        </div>
      )}
    </div>
  );
}
