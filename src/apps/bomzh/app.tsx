"use client";

import { useAudio } from "@/hooks/use-audio";
import type { Manifest } from "@/lib/manifest";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./app.module.css";

const EXPLOSION_THRESHOLD = 10;
const EXPLOSION_DURATION = 5000;
const SCREAM_MS = 350;
const FLOAT_ORE_MS = 1000;

const AUDIO_ASSETS = {
  scream: "scream.mp3",
  explosion: "explosion.mp3",
} as const;

export default function BomzhApp({ manifest }: { manifest: Manifest }) {
  const [clicks, setClicks] = useState<number>(0);
  const [isScreaming, setIsScreaming] = useState<boolean>(false);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [floatingOres, setFloatingOres] = useState<{ id: number; x: number; y: number }[]>([]);

  const oreIdRef = useRef<number>(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const { play, muted, toggleMute } = useAudio(manifest.slug, AUDIO_ASSETS, "clicker_bomzh_muted");

  const addTimer = useCallback((fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }, []);

  useEffect(() => {
    const saved = Number.parseInt(
      localStorage.getItem(`clicker_${manifest.slug}_count`) ?? "0",
      10,
    );
    setClicks(Number.isNaN(saved) || saved >= EXPLOSION_THRESHOLD ? 0 : saved);
  }, [manifest.slug]);

  useEffect(() => {
    const img = new Image();
    img.src = `/apps/${manifest.slug}/assets/hobo-scream.webp`;
  }, [manifest.slug]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isExploded) return;

    if (clicks + 1 >= EXPLOSION_THRESHOLD) {
      setIsExploded(true);
      play("explosion", 1.0);
      addTimer(() => {
        setClicks(0);
        setIsExploded(false);
        localStorage.setItem(`clicker_${manifest.slug}_count`, "0");
      }, EXPLOSION_DURATION);
      return;
    }

    play("scream", 0.4);

    const newCount = clicks + 1;
    setClicks(newCount);
    localStorage.setItem(`clicker_${manifest.slug}_count`, newCount.toString());

    setIsScreaming(true);
    addTimer(() => setIsScreaming(false), SCREAM_MS);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newId = oreIdRef.current++;
    setFloatingOres((prev) => [...prev, { id: newId, x, y }]);
    addTimer(() => {
      setFloatingOres((prev) => prev.filter((o) => o.id !== newId));
    }, FLOAT_ORE_MS);
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
    <div className="flex flex-col items-center select-none py-6 sm:py-12">
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        aria-pressed={muted}
        className="absolute right-4 top-4 text-2xl text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {muted ? "🔇" : "🔊"}
      </button>

      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Нажми на ${manifest.title}, чтобы заставить его орать`}
        className="relative cursor-pointer max-w-[240px] sm:max-w-[320px] w-full aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background p-0 overflow-visible"
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
              src={`/apps/${manifest.slug}/assets/${isScreaming ? "hobo-scream" : "hobo-regular"}.webp`}
              alt={manifest.title}
              width={512}
              height={512}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}
      </button>

      {!isExploded && (
        <div className="mt-6 sm:mt-8 text-center">
          <span className="font-mono text-xs text-muted block uppercase tracking-wider">
            всего оров
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-accent block mt-1 font-mono">
            {clicks}
          </span>
          <span className="text-xs text-muted block mt-3 sm:mt-4 max-w-[240px] px-4">
            жми на бомжа, чтобы заставить его орать
          </span>
        </div>
      )}

      {isExploded && (
        <div className="mt-6 sm:mt-8 text-center animate-pulse">
          <span className="text-lg font-bold text-accent">БОМЖ ВЗОРВАЛСЯ!</span>
        </div>
      )}
    </div>
  );
}
