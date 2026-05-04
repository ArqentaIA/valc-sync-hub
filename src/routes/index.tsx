import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Sparkles, ShieldCheck, Zap } from "lucide-react";
import bgImage from "@/assets/embarques.jpg";
import logoValc from "@/assets/logo_VALC.ico";
import { Button } from "@/components/ui/button";
import { processExcelFile } from "@/lib/excel-processor";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Procesador de Archivos – VALC" },
      {
        name: "description",
        content:
          "Carga, procesamiento y consolidación automática de archivos Excel con resumen agrupado.",
      },
    ],
  }),
});

type StepStatus = "pending" | "active" | "done" | "error";

const STEP_LABELS = [
  "Archivo cargado",
  "Validando estructura",
  "Procesando información",
  "AGRUPANDO REGISTROS",
  "Archivo listo",
];

function Index() {
  const [steps, setSteps] = useState<StepStatus[]>(Array(5).fill("pending"));
  const [message, setMessage] = useState<string>(
    "Carga tu archivo para iniciar el procesamiento automático"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setStep = (index: number, status: StepStatus) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = status;
      return next;
    });
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleFile = async (file: File) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setHasError(false);
    setResultBlob(null);
    setResultName("");
    setFileName(file.name);
    setSteps(Array(5).fill("pending"));

    try {
      // Step 1
      setStep(0, "active");
      setMessage("Archivo cargado correctamente");
      await wait(350);
      setStep(0, "done");

      // Step 2
      setStep(1, "active");
      setMessage("Validando columnas…");
      await wait(450);

      // Step 3 — actual processing
      setStep(1, "done");
      setStep(2, "active");
      setMessage("Procesando registros…");
      const result = await processExcelFile(file);
      await wait(300);
      setStep(2, "done");

      // Step 4
      setStep(3, "active");
      setMessage("Generando archivo final…");
      await wait(400);
      setStep(3, "done");

      // Step 5
      setStep(4, "done");
      setMessage(
        `Proceso completado correctamente · ${result.totalRows} registros · ${result.groupedRows} grupos`
      );
      setResultBlob(result.blob);
      setResultName(result.fileName);
      toast.success("Proceso finalizado. Archivo listo para descarga", {
        duration: 5000,
      });
    } catch (err) {
      setHasError(true);
      const activeIdx = steps.findIndex((s) => s === "active");
      setSteps((prev) =>
        prev.map((s, i) => {
          if (s === "done") return "done";
          if (i === (activeIdx >= 0 ? activeIdx : prev.findIndex((x) => x !== "done")))
            return "error";
          return "pending";
        })
      );
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const onPick = () => fileInputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const onDownload = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    if (isProcessing) return;
    setSteps(Array(5).fill("pending"));
    setMessage("Carga tu archivo para iniciar el procesamiento automático");
    setHasError(false);
    setResultBlob(null);
    setResultName("");
    setFileName("");
  };

  return (
    <main
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Capa marca de agua: blanco translúcido + leve desaturación para efecto papel */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(1 0 0 / 0.55) 0%, oklch(1 0 0 / 0.45) 50%, oklch(0.95 0.02 240 / 0.5) 100%)",
          backdropFilter: "saturate(50%) brightness(1.15) blur(1px)",
          WebkitBackdropFilter: "saturate(50%) brightness(1.15) blur(1px)",
        }}
        aria-hidden
      />
      {/* Overlay degradado izquierda → derecha (más suave para no oscurecer) */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-overlay)" }}
        aria-hidden
      />
      {/* Luz cálida lado derecho (sol entrando) — intensificada */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 85% 30%, oklch(0.96 0.13 80 / 0.45) 0%, oklch(0.92 0.1 75 / 0.18) 35%, transparent 65%)",
        }}
        aria-hidden
      />
      {/* Halo central luminoso — agrega luz sin perder detalle */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, oklch(1 0 0 / 0.18) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      {/* Reflejo agua azul claro (sutil) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.85 0.08 230 / 0.1) 0%, transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
        {/* Logo VALC superior izquierda */}
        <div className="absolute left-6 top-6 z-20 flex items-center sm:left-10 sm:top-8">
          <img
            src={logoValc}
            alt="VALC"
            className="h-12 w-auto object-contain sm:h-16 md:h-20"
            style={{
              filter:
                "brightness(1.08) contrast(1.05) drop-shadow(0 0 12px oklch(1 0 0 / 0.45)) drop-shadow(0 0 28px oklch(1 0 0 / 0.25))",
            }}
          />
        </div>
        <div className="w-full max-w-5xl">
          {/* Glass card premium */}
          <section className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
            {/* highlight superior decorativo */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[oklch(0.62_0.2_250/0.25)] blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[oklch(0.78_0.16_75/0.15)] blur-3xl" aria-hidden />

            <header className="relative mb-5 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white text-shadow-soft sm:text-3xl md:text-4xl">
                Agrupa los datos{" "}
                <span className="bg-gradient-to-r from-white via-white/90 to-[oklch(0.85_0.1_240)] bg-clip-text text-transparent">
                  en segundos.
                </span>
              </h1>
            </header>

            {/* Primary action */}
            <div className="relative flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onChange}
              />
              <button
                onClick={onPick}
                disabled={isProcessing || resultBlob !== null}
                className={[
                  "group relative h-14 w-full max-w-md overflow-hidden rounded-2xl text-base font-semibold text-white transition-all",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "shadow-[0_25px_60px_-15px_oklch(0.5_0.22_265/0.75)]",
                  !isProcessing && !resultBlob ? "btn-glow hover:scale-[1.03] active:scale-[0.99]" : "",
                ].join(" ")}
                style={{ background: "var(--gradient-brand)" }}
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                <span className="relative flex items-center justify-center gap-2.5">
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {isProcessing ? "Procesando…" : "Subir archivo Excel"}
                </span>
                {isProcessing && (
                  <span className="shimmer absolute inset-0" aria-hidden />
                )}
              </button>
              <p className="text-[10px] uppercase tracking-widest text-white/50">
                .xlsx · .xls · Hasta 100MB
              </p>
              {fileName && (
                <div className="flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85 ring-1 ring-white/15 backdrop-blur">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
            </div>

            {/* Timeline en 2 columnas */}
            <ol className="relative mt-6 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {STEP_LABELS.map((label, i) => (
                <TimelineStep key={label} index={i} label={label} status={steps[i]} />
              ))}
            </ol>

            {/* Dynamic message */}
            <div
              className={[
                "mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur-md transition-all",
                hasError
                  ? "border-red-400/30 bg-red-500/10 text-red-100"
                  : resultBlob
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-50"
                    : "border-white/15 bg-white/5 text-white/85",
              ].join(" ")}
            >
              {hasError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : isProcessing ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : resultBlob ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              ) : (
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
              )}
              <span className="leading-relaxed">{message}</span>
            </div>

            {/* Error CTA — vuelve al inicio */}
            {hasError && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={reset}
                  className="group relative h-12 overflow-hidden rounded-2xl px-7 text-sm font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98] shadow-[0_15px_40px_-10px_oklch(0.6_0.22_25/0.55)]"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.65 0.22 30) 0%, oklch(0.55 0.24 18) 100%)",
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Revisar archivo y reintentar
                  </span>
                </button>
              </div>
            )}

            {/* Secondary action */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={reset}
                disabled={isProcessing || (!fileName && !hasError)}
                className="text-sm font-medium text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↺ Reiniciar
              </button>
              <button
                onClick={onDownload}
                disabled={!resultBlob}
                className={[
                  "group relative h-11 overflow-hidden rounded-2xl px-6 text-sm font-semibold transition-all",
                  resultBlob
                    ? "text-white shadow-[0_15px_40px_-10px_oklch(0.55_0.2_158/0.6)] hover:scale-[1.03] active:scale-[0.98]"
                    : "cursor-not-allowed bg-white/5 text-white/30 ring-1 ring-white/10",
                ].join(" ")}
                style={resultBlob ? { background: "var(--gradient-success)" } : undefined}
              >
                {resultBlob && (
                  <span className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" />
                  Descargar resultado
                </span>
              </button>
            </div>

          </section>

          {/* Footer fino */}
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
            Procesamiento determinístico · Sin envío de datos a la nube
          </p>
        </div>
      </div>

      <Toaster position="top-right" theme="dark" richColors />
    </main>
  );
}

function TimelineStep({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: StepStatus;
}) {
  const isLast = index === STEP_LABELS.length - 1;

  const dotClass =
    status === "done"
      ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_oklch(0.7_0.18_152/0.4)]"
      : status === "active"
        ? "border-[oklch(0.62_0.2_250)] bg-[oklch(0.62_0.2_250/0.25)] text-white shadow-[0_0_24px_oklch(0.62_0.2_250/0.6)]"
        : status === "error"
          ? "border-red-400/60 bg-red-500/20 text-red-300"
          : "border-white/20 bg-white/5 text-white/40";

  const textColor =
    status === "done"
      ? "text-white/90"
      : status === "active"
        ? "text-white font-bold text-base"
        : status === "error"
          ? "text-red-200 font-semibold"
          : "text-white/30";

  return (
    <li className="relative flex items-center gap-4 py-2">
      {!isLast && (
        <span
          className={[
            "absolute left-[19px] top-[calc(50%+18px)] h-[calc(100%-12px)] w-px transition-colors",
            status === "done" ? "bg-emerald-400/40" : "bg-white/10",
          ].join(" ")}
          aria-hidden
        />
      )}
      <div
        className={[
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold backdrop-blur-sm transition-all",
          dotClass,
        ].join(" ")}
      >
        {status === "active" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.62_0.2_250/0.4)]" aria-hidden />
        )}
        <span className="relative">
          {status === "done" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === "active" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <span className="text-[11px]">{index + 1}</span>
          )}
        </span>
      </div>
      <p className={`text-sm transition-colors ${textColor}`}>{label}</p>
    </li>
  );
}
