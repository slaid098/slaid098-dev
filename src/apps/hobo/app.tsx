"use client";

import type { Manifest } from "@/lib/manifest";
import { useEffect, useRef, useState } from "react";
import styles from "./app.module.css";

const EXPLOSION_THRESHOLD = 10;
const EXPLOSION_DURATION = 5000;
const SCREAM_MS = 350;
const FLOAT_ORE_MS = 1000;

export default function HoboApp({ manifest }: { manifest: Manifest }) {
  const [clicks, setClicks] = useState<number>(0);
  const [isScreaming, setIsScreaming] = useState<boolean>(false);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [floatingOres, setFloatingOres] = useState<{ id: number; x: number; y: number }[]>([]);

  const oreIdRef = useRef<number>(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const screamArrayBufRef = useRef<ArrayBuffer | null>(null);
  const explosionArrayBufRef = useRef<ArrayBuffer | null>(null);
  const screamBufRef = useRef<AudioBuffer | null>(null);
  const explosionBufRef = useRef<AudioBuffer | null>(null);

  const addTimer = (fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  };

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
    let active = true;
    const loadAudio = async () => {
      try {
        const [screamRes, explosionRes] = await Promise.all([
          fetch(`/apps/${manifest.slug}/assets/scream.mp3`),
          fetch(`/apps/${manifest.slug}/assets/explosion.mp3`),
        ]);
        if (!screamRes.ok || !explosionRes.ok) return;
        const [screamAB, explosionAB] = await Promise.all([
          screamRes.arrayBuffer(),
          explosionRes.arrayBuffer(),
        ]);
        if (active) {
          screamArrayBufRef.current = screamAB;
          explosionArrayBufRef.current = explosionAB;
        }
      } catch {
        // audio optional, silent fail
      }
    };
    loadAudio();
    return () => {
      active = false;
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [manifest.slug]);

  function ensureAudio(): void {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      return;
    }
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;
    if (screamArrayBufRef.current && !screamBufRef.current) {
      ctx.decodeAudioData(screamArrayBufRef.current).then((buf) => {
        screamBufRef.current = buf;
      });
    }
    if (explosionArrayBufRef.current && !explosionBufRef.current) {
      ctx.decodeAudioData(explosionArrayBufRef.current).then((buf) => {
        explosionBufRef.current = buf;
      });
    }
  }

  function playBuffer(buf: AudioBuffer | null): void {
    const ctx = audioCtxRef.current;
    if (ctx && buf) {
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.start(0);
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isExploded) return;
    ensureAudio();

    if (clicks + 1 >= EXPLOSION_THRESHOLD) {
      setIsExploded(true);
      playBuffer(explosionBufRef.current);
      addTimer(() => {
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
