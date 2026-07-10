"use client";

import type { Manifest } from "@/lib/manifest";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CatAnalysis,
  analyzeSelfie,
  fetchImageBlob,
  generateCat,
  isAbortError,
  isNetworkError,
} from "./api";
import styles from "./app.module.css";
import { pickLoadingMessage } from "./prompts";

type Screen = "hero" | "preview" | "loading" | "result" | "camera";
type LoadingPhase = "analyzing" | "thinking" | "drawing";

const LOADING_PHASES: { phase: LoadingPhase; text: string }[] = [
  { phase: "analyzing", text: "Анализирую селфи…" },
  { phase: "thinking", text: "Думаю над характером…" },
  { phase: "drawing", text: "Рисую кота…" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
  const [imgError, setImgError] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const imgSrcRef = useRef<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Abort in-flight requests and revoke blob URL on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      stopCamera();
    };
  }, []);

  // Rotate loading messages during loading
  useEffect(() => {
    if (screen !== "loading") return;
    setLoadingMessage(pickLoadingMessage());
    const id = setInterval(() => {
      setLoadingMessage((prev) => pickLoadingMessage(prev));
    }, 5500);
    return () => clearInterval(id);
  }, [screen]);

  const handleError = useCallback((message: string) => {
    setError(message);
    setScreen("hero");
  }, []);

  const stopCamera = useCallback(() => {
    const stream = cameraStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      // No getUserMedia — fall back to file picker (without capture)
      if (cameraInputRef.current) {
        cameraInputRef.current.removeAttribute("capture");
        cameraInputRef.current.click();
      }
      return;
    }
    try {
      const stream = await mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setScreen("camera");
      requestAnimationFrame(() => {
        const video = cameraVideoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
      });
    } catch {
      // Permission denied or unavailable — fall back to file picker
      if (cameraInputRef.current) {
        cameraInputRef.current.removeAttribute("capture");
        cameraInputRef.current.click();
      }
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    setSelfieUrl(dataUrl);
    setError(null);
    setScreen("preview");
  }, [stopCamera]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setScreen("hero");
  }, [stopCamera]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        handleError("Это не изображение. Попробуй другой файл.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        handleError("Файл слишком большой (макс 10 МБ).");
        return;
      }
      try {
        const dataUrl = await readFileAsDataURL(file);
        setSelfieUrl(dataUrl);
        setError(null);
        setScreen("preview");
      } catch {
        handleError("Не получилось прочитать файл. Попробуй ещё раз.");
      }
    },
    [handleError],
  );

  const runAnalysis = useCallback(async () => {
    if (screen === "loading") return;
    if (!selfieUrl) {
      setScreen("hero");
      return;
    }
    setError(null);
    setResult(null);
    setResultImgUrl(null);
    setImgError(false);
    setScreen("loading");
    setLoadingPhase("analyzing");

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const analysis = await analyzeSelfie(selfieUrl, ac.signal);
      setLoadingPhase("thinking");
      const imgSrc = await generateCat(analysis.imgPrompt, analysis.catBreed);
      setLoadingPhase("drawing");

      // Revoke any previous blob URL before creating a new one
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      let blobUrl: string;
      try {
        blobUrl = await fetchImageBlob(imgSrc, ac.signal);
      } catch (imgErr) {
        if (isAbortError(imgErr)) throw imgErr;
        // Image failed but text is ready — show result with retry placeholder
        imgSrcRef.current = imgSrc;
        setResult(analysis);
        setResultImgUrl(null);
        setImgError(true);
        setImgLoading(false);
        setScreen("result");
        return;
      }

      if (ac.signal.aborted) {
        URL.revokeObjectURL(blobUrl);
        return;
      }

      imgSrcRef.current = imgSrc;
      blobUrlRef.current = blobUrl;
      setResult(analysis);
      setResultImgUrl(blobUrl);
      setImgError(false);
      setImgLoading(true);
      setScreen("result");
    } catch (err) {
      if (isAbortError(err)) {
        setScreen("preview");
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "quota-exceeded" || msg.includes("миска пуста")) {
        // Show funny quota message instead of generic error
        setError("Твоя миска пуста. Приходи завтра за новой порцией презрения.");
        setScreen("hero");
      } else if (msg.includes("analyze-http-5") || msg.includes("ai-unavailable")) {
        handleError("AI-сервер лёг. Попробуй через минуту.");
      } else if (msg.includes("Incomplete") || msg.includes("Empty")) {
        handleError("AI не смог разобрать фото. Попробуй другое селфи.");
      } else if (isNetworkError(err)) {
        handleError("Сетевая ошибка. Проверь интернет.");
      } else {
        handleError("Кот не нарисовался. Попробуй ещё раз.");
      }
    } finally {
      abortRef.current = null;
    }
  }, [screen, selfieUrl, handleError]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    imgSrcRef.current = null;
    stopCamera();
    setSelfieUrl(null);
    setResult(null);
    setResultImgUrl(null);
    setError(null);
    setImgError(false);
    setImgLoading(false);
    setScreen("hero");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
      cameraInputRef.current.setAttribute("capture", "user");
    }
  }, [stopCamera]);

  const handleRetryImage = useCallback(async () => {
    if (!imgSrcRef.current) return;
    setImgError(false);
    setImgLoading(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const separator = imgSrcRef.current.includes("?") ? "&" : "?";
    const retrySrc = `${imgSrcRef.current}${separator}_retry=${Date.now()}`;

    try {
      const newBlobUrl = await fetchImageBlob(retrySrc, ac.signal);
      if (ac.signal.aborted) {
        URL.revokeObjectURL(newBlobUrl);
        return;
      }
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = newBlobUrl;
      setResultImgUrl(newBlobUrl);
      setImgError(false);
      setImgLoading(false);
    } catch (err) {
      if (isAbortError(err)) return;
      setImgError(true);
      setImgLoading(false);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultImgUrl) return;
    try {
      const res = await fetch(resultImgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `okoti-menya-${result?.catName ?? "cat"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(resultImgUrl, "_blank", "noopener");
    }
  }, [resultImgUrl, result?.catName]);

  const isLoading = screen === "loading";

  return (
    <div className="flex flex-col items-center py-6 sm:py-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        aria-label="Загрузить селфи с устройства"
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
        aria-label="Сделать селфи с камеры"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error && (
        <div
          role="alert"
          className="mx-auto mb-6 max-w-md rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {screen === "hero" && (
        <div className="flex flex-col items-center text-center px-4">
          <p className="mb-8 max-w-sm text-sm text-muted">
            Фото обрабатывается на твоём устройстве.
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
              onClick={() => void startCamera()}
              className="rounded-lg border border-line bg-surface px-6 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Сделать селфи сейчас
            </button>
          </div>
        </div>
      )}

      {screen === "camera" && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            className="flex-1 w-full object-cover"
            aria-label="Предпросмотр камеры"
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-8 bg-gradient-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={captureFrame}
              className="rounded-full bg-accent px-8 py-4 text-sm font-bold text-black transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Сделать фото
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
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();
                }
              }}
              className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm font-medium text-muted transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Выбрать другое
            </button>
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={isLoading}
              aria-busy={isLoading}
              className="flex-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:hover:scale-100"
            >
              Создать кота
            </button>
          </div>
        </div>
      )}

      {screen === "loading" && (
        <output className="flex flex-col items-center px-4 py-16" aria-live="polite">
          <div className="mb-6 flex gap-3 text-3xl" aria-hidden="true">
            <span className={`${styles.paw} ${styles.pawDelay1}`}>🐾</span>
            <span className={`${styles.paw} ${styles.pawDelay2}`}>🐾</span>
            <span className={`${styles.paw} ${styles.pawDelay3}`}>🐾</span>
          </div>
          <p className="text-base text-muted">
            {LOADING_PHASES.find((p) => p.phase === loadingPhase)?.text ?? "Анализирую селфи…"}
          </p>
          {loadingMessage && (
            <p
              key={loadingMessage}
              className={`mt-4 max-w-sm text-center text-sm text-muted/70 ${styles.funFact}`}
            >
              {loadingMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="mt-8 rounded-lg border border-line bg-surface px-4 py-2 text-xs font-medium text-muted transition hover:border-red-500/50 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Отмена
          </button>
        </output>
      )}

      {screen === "result" && result && (
        <div className={`flex flex-col items-center px-4 ${styles.fadeInUp}`}>
          <div className="relative mb-6 overflow-hidden rounded-xl border border-line">
            {imgLoading && !imgError && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <div className="flex gap-2 text-2xl" aria-hidden="true">
                  <span className={`${styles.paw} ${styles.pawDelay1}`}>🐾</span>
                  <span className={`${styles.paw} ${styles.pawDelay2}`}>🐾</span>
                  <span className={`${styles.paw} ${styles.pawDelay3}`}>🐾</span>
                </div>
              </div>
            )}
            {imgError ? (
              <div className="flex aspect-square max-h-96 max-w-full items-center justify-center bg-surface text-center">
                <div>
                  <p className="mb-3 text-sm text-muted">Картинка не загрузилась</p>
                  <button
                    type="button"
                    onClick={() => void handleRetryImage()}
                    className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
                  >
                    Повторить
                  </button>
                </div>
              </div>
            ) : resultImgUrl ? (
              <img
                src={resultImgUrl}
                alt={`Кот по кличке ${result.catName}, порода ${result.catBreed}. ${result.personality}`}
                className="max-h-96 max-w-full object-contain"
                onLoad={() => setImgLoading(false)}
                onError={() => {
                  setImgLoading(false);
                  setImgError(true);
                }}
              />
            ) : (
              <div className="aspect-square max-h-96 max-w-full bg-surface" />
            )}
          </div>

          {!imgLoading && (
            <div className="mb-6 max-w-md text-center">
              <p className="text-2xl font-extrabold tracking-tight text-accent">{result.catName}</p>
              <p className="mt-1 text-sm font-mono uppercase tracking-wider text-muted">
                {result.catBreed}
              </p>
              {result.personality && <p className="mt-4 text-base text-fg">{result.personality}</p>}
              {result.funFact && (
                <p className="mt-3 text-sm italic text-muted">— {result.funFact}</p>
              )}
            </div>
          )}

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
              disabled={imgLoading || imgError}
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
