"use client";

import type { Manifest } from "@/lib/manifest";
import { useEffect, useRef, useState } from "react";

export function ClickerApp({ manifest }: { manifest: Manifest; folder: string }) {
  const [clicks, setClicks] = useState<number>(0);
  const [isScreaming, setIsScreaming] = useState<boolean>(false);
  const [floatingOres, setFloatingOres] = useState<{ id: number; x: number; y: number }[]>([]);
  const oreIdRef = useRef<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  // Load counter from localStorage on client-mount
  useEffect(() => {
    const saved = localStorage.getItem(`clicker_${manifest.slug}_count`);
    if (saved) {
      setClicks(Number.parseInt(saved, 10) || 0);
    }
  }, [manifest.slug]);

  // Pre-load audio to avoid delay on click
  useEffect(() => {
    let active = true;
    const loadAudio = async () => {
      try {
        const url = `/apps/${manifest.slug}/assets/scream.wav`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Audio download failed");
        const arrayBuffer = await res.arrayBuffer();

        // Create AudioContext lazily or on load
        const AudioContextClass =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const buffer = await ctx.decodeAudioData(arrayBuffer);
        if (active) {
          audioBufferRef.current = buffer;
        }
      } catch (err) {
        console.error("Failed to load soundboard audio:", err);
      }
    };
    loadAudio();
    return () => {
      active = false;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [manifest.slug]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 1. Play audio
    const ctx = audioContextRef.current;
    const buffer = audioBufferRef.current;
    if (ctx && buffer) {
      // Resume if suspended (browser security autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } else {
      // Fallback: simple HTMLAudioElement if Web Audio fails or still loading
      const fallback = new Audio(`/apps/${manifest.slug}/assets/scream.wav`);
      fallback.play().catch(() => {});
    }

    // 2. Increment count & save
    const newCount = clicks + 1;
    setClicks(newCount);
    localStorage.setItem(`clicker_${manifest.slug}_count`, newCount.toString());

    // 3. Trigger visual shake
    setIsScreaming(true);
    setTimeout(() => setIsScreaming(false), 350);

    // 4. Create floating "ОР!" text at click location
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newId = oreIdRef.current++;
    setFloatingOres((prev) => [...prev, { id: newId, x, y }]);

    // Remove floating text after animation completes
    setTimeout(() => {
      setFloatingOres((prev) => prev.filter((o) => o.id !== newId));
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Simulate click at center of element
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
      {/* Clicker Area */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Нажми на ${manifest.title}, чтобы заставить его орать`}
        className="relative cursor-pointer max-w-[320px] w-full aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background p-0"
      >
        {/* Floating text elements */}
        {floatingOres.map((ore) => (
          <span
            key={ore.id}
            className="absolute font-mono font-bold text-accent text-3xl pointer-events-none animate-float-ore"
            style={{ left: ore.x, top: ore.y - 20 }}
          >
            ОР!
          </span>
        ))}

        {/* Character Image Container */}
        <div
          className={`w-full h-full transition duration-75 ${
            isScreaming ? "scale-[1.12] rotate-1 animate-hobo-shake" : "hover:scale-[1.02]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/apps/${manifest.slug}/assets/hobo.svg`}
            alt={manifest.title}
            className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(204,255,0,0.15)]"
            draggable={false}
          />
        </div>
      </button>

      {/* Stats Board */}
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
    </div>
  );
}
