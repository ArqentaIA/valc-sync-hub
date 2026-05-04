/**
 * Motor IA (DeepSeek) — módulo opcional.
 *
 * No se ejecuta automáticamente. Sólo se usa cuando:
 *   1. El usuario activa la opción explícitamente.
 *   2. Existe una API KEY válida en `DEEPSEEK_API_KEY`.
 *
 * Si falla, debe degradar a modo estándar sin bloquear el flujo.
 */

export interface DeepSeekConfig {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export const defaultDeepSeekConfig: DeepSeekConfig = {
  apiKey: undefined, // léase desde env DEEPSEEK_API_KEY al integrarse server-side
  endpoint: "https://api.deepseek.com/v1/chat/completions",
  timeoutMs: 15000,
};

export function isAIAvailable(cfg: DeepSeekConfig): boolean {
  return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
}

/**
 * Stub determinístico — sin llamadas externas por defecto.
 * Cuando se conecte realmente, implementar fetch con AbortController y timeout.
 */
export async function translateOrNormalize(
  _text: string,
  cfg: DeepSeekConfig = defaultDeepSeekConfig
): Promise<{ ok: boolean; result: string; reason?: string }> {
  if (!isAIAvailable(cfg)) {
    return { ok: false, result: _text, reason: "IA no disponible, proceso continúa en modo estándar" };
  }
  // Implementación real diferida: aquí iría fetch al endpoint configurado.
  return { ok: false, result: _text, reason: "Motor IA aún no integrado" };
}