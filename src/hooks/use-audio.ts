"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioAssets = Record<string, string>;

type AudioContextConstructor = typeof AudioContext;

interface UseAudioReturn {
  play: (name: string, volume: number) => void;
  muted: boolean;
  toggleMute: () => void;
}

export function useAudio(slug: string, assets: AudioAssets, storageKey: string): UseAudioReturn {
  const [muted, setMuted] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufsRef = useRef<Map<string, AudioBuffer>>(new Map());

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "true") setMuted(true);
  }, [storageKey]);

  useEffect(() => {
    let active = true;

    const loadAll = async () => {
      try {
        const Ctor: AudioContextConstructor | undefined =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
        if (!Ctor) return;

        const ctx = new Ctor();
        if (!active) {
          ctx.close().catch(() => {});
          return;
        }
        audioCtxRef.current = ctx;

        const entries = await Promise.all(
          Object.entries(assets).map(async ([name, file]) => {
            const res = await fetch(`/apps/${slug}/assets/${file}`);
            if (!res.ok) return null;
            const ab = await res.arrayBuffer();
            const buf = await ctx.decodeAudioData(ab);
            return [name, buf] as const;
          }),
        );
        if (!active) return;
        for (const entry of entries) {
          if (entry !== null) audioBufsRef.current.set(entry[0], entry[1]);
        }
      } catch {
        // audio optional, silent fail
      }
    };

    loadAll();

    return () => {
      active = false;
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [slug, assets]);

  const play = useCallback(
    (name: string, volume: number): void => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const buf = audioBufsRef.current.get(name);
      if (!buf) return;
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : volume;
      source.buffer = buf;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    },
    [muted],
  );

  const toggleMute = useCallback((): void => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  }, [storageKey]);

  return { play, muted, toggleMute };
}
