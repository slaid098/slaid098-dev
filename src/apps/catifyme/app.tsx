"use client";

import type { Manifest } from "@/lib/manifest";
import { useCallback, useRef, useState } from "react";
import { type CatAnalysis, analyzeSelfie, generateCat, isAbortError } from "./api";
import styles from "./app.module.css";

type Screen = "hero" | "preview" | "loading" | "result";
type LoadingPhase = "analyzing" | "thinking" | "drawing";

const LOADING_PHASES: { phase: LoadingPhase; text: string }[] = [
  { phase: "analyzing", text: "Анализирую селфи…" },
  { phase: "thinking", text: "Думаю над характером…" },
  { phase: "drawing", text: "Рисую кота…" },
];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-error"));
    reader.readAsDataURL(file);
  });
}

export default function CatifyMeApp({ manifest: _manifest }: { manifest: Manifest }) {
  const [screen, setScreen] = useState<Screen>("hero");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("analyzing");
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CatAnalysis | null>(null);
  const [resultImgUrl, setResultImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    setScreen("hero");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        handleError("Это не изображение. Попробуй другой файл.");
        return;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        setSelfieUrl(dataUrl);
        setScreen("preview");
      } catch {
        handleError("Не получилось прочитать файл. Попробуй ещё раз.");
      }
    },
    [handleError],
  );

  const runAnalysis = useCallback(async () => {
    if (!selfieUrl) {
      setScreen("hero");
      return;
    }
    setError(null);
    setResult(null);
    setResultImgUrl(null);
    setScreen("loading");
    setLoadingPhase("analyzing");

    try {
      const analysis = await analyzeSelfie(selfieUrl);
      setLoadingPhase("thinking");
      const imgUrl = await generateCat(analysis.imgPrompt, analysis.catBreed);
      setResult(analysis);
      setResultImgUrl(imgUrl);
      setImgLoading(true);
      setScreen("result");
    } catch (err) {
      if (isAbortError(err)) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("vision-http-429")) {
        handleError("Слишком много запросов. Подожди минуту и попробуй снова.");
      } else if (msg.includes("vision-http-5")) {
        handleError("AI-сервер лёг. Попробуй через минуту.");
      } else if (msg.includes("Incomplete") || msg.includes("Empty")) {
        handleError("AI не смог разобрать фото. Попробуй другое селфи.");
      } else if (msg.includes("Failed to fetch") || msg.includes("network")) {
        handleError("Сетевая ошибка. Проверь интернет.");
      } else {
        handleError("Кот не нарисовался. Попробуй ещё раз.");
      }
    }
  }, [selfieUrl, handleError]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setSelfieUrl(null);
    setResult(null);
    setResultImgUrl(null);
    setError(null);
    setScreen("hero");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultImgUrl) return;
    try {
      const res = await fetch(resultImgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catifyme-${result?.catName ?? "cat"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(resultImgUrl, "_blank", "noopener");
    }
  }, [resultImgUrl, result?.catName]);

  return (
    <div className="flex flex-col items-center py-6 sm:py-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error && (
        <div className="mx-auto mb-6 max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {screen === "hero" && (
        <div className="flex flex-col items-center text-center px-4">
          <p className="mb-2 text-5xl" aria-hidden="true">
            🐱
          </p>
          <p className="mb-8 max-w-sm text-sm text-muted">
            Загрузи селфи — получишь мультяшного кота под свой вайб. Фото обрабатывается на твоём
            устройстве.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Загрузить селфи
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-lg border border-line bg-surface px-6 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Сделать селфи сейчас
            </button>
          </div>
        </div>
      )}

      {screen === "preview" && selfieUrl && (
        <div className="flex flex-col items-center px-4">
          <div className="mb-6 overflow-hidden rounded-xl border border-line">
            <img src={selfieUrl} alt="Твоё селфи" className="max-h-80 max-w-full object-contain" />
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Другое
            </button>
            <button
              type="button"
              onClick={() => void runAnalysis()}
              className="flex-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Создать кота
            </button>
          </div>
        </div>
      )}

      {screen === "loading" && (
        <div className="flex flex-col items-center px-4 py-16">
          <div className="mb-6 flex gap-3 text-3xl" aria-hidden="true">
            <span className={`${styles.paw} ${styles.pawDelay1}`}>🐾</span>
            <span className={`${styles.paw} ${styles.pawDelay2}`}>🐾</span>
            <span className={`${styles.paw} ${styles.pawDelay3}`}>🐾</span>
          </div>
          <p className="text-base text-muted" aria-live="polite">
            {LOADING_PHASES.find((p) => p.phase === loadingPhase)?.text ?? "Анализирую селфи…"}
          </p>
          <p className="mt-3 text-xs text-muted/60">AI думает, это может занять ~30 секунд</p>
        </div>
      )}

      {screen === "result" && result && resultImgUrl && (
        <div className={`flex flex-col items-center px-4 ${styles.fadeInUp}`}>
          <div className="relative mb-6 overflow-hidden rounded-xl border border-line">
            {imgLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <div className="flex gap-2 text-2xl" aria-hidden="true">
                  <span className={`${styles.paw} ${styles.pawDelay1}`}>🐾</span>
                  <span className={`${styles.paw} ${styles.pawDelay2}`}>🐾</span>
                  <span className={`${styles.paw} ${styles.pawDelay3}`}>🐾</span>
                </div>
              </div>
            )}
            <img
              src={resultImgUrl}
              alt={`Кот ${result.catName}`}
              className="max-h-96 max-w-full object-contain"
              onLoad={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
            />
          </div>

          <div className="mb-6 max-w-md text-center">
            <p className="text-2xl font-extrabold tracking-tight text-accent">{result.catName}</p>
            <p className="mt-1 text-sm font-mono uppercase tracking-wider text-muted">
              {result.catBreed}
            </p>
            {result.personality && <p className="mt-4 text-base text-fg">{result.personality}</p>}
            {result.funFact && <p className="mt-3 text-sm italic text-muted">— {result.funFact}</p>}
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Другое фото
            </button>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={imgLoading}
              className="flex-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Скачать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
