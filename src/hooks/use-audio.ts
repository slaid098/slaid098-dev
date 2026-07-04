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
  const arrayBufsRef = useRef<Map<string, ArrayBuffer>>(new Map());
  const audioBufsRef = useRef<Map<string, AudioBuffer>>(new Map());
  const decodingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "true") setMuted(true);
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      try {
        const entries = await Promise.all(
          Object.entries(assets).map(async ([name, file]) => {
            const res = await fetch(`/apps/${slug}/assets/${file}`);
            if (!res.ok) return null;
            return [name, await res.arrayBuffer()] as const;
          }),
        );
        if (!active) return;
        for (const entry of entries) {
          if (entry !== null) arrayBufsRef.current.set(entry[0], entry[1]);
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

  const ensureContext = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      return audioCtxRef.current;
    }
    const Ctor: AudioContextConstructor | undefined =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    for (const [name, ab] of arrayBufsRef.current) {
      if (!audioBufsRef.current.has(name) && !decodingRef.current.has(name)) {
        decodingRef.current.add(name);
        ctx
          .decodeAudioData(ab)
          .then((buf) => {
            audioBufsRef.current.set(name, buf);
          })
          .catch(() => {
            // decode failed, will retry on next play attempt
          })
          .finally(() => {
            decodingRef.current.delete(name);
          });
      }
    }
    return ctx;
  }, []);

  const play = useCallback(
    (name: string, volume: number): void => {
      const ctx = ensureContext();
      if (!ctx) return;
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
    [ensureContext, muted],
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
