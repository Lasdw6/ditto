type AiTracePayload = {
  agent: string;
  stage: "start" | "success" | "fallback" | "error";
  context: Record<string, unknown>;
  system?: string;
  prompt?: string;
  output?: string;
  error?: unknown;
};

export function logAiTrace(payload: AiTracePayload) {
  const stamp = new Date().toISOString();
  const safeError =
    payload.error instanceof Error
      ? {
          name: payload.error.name,
          message: payload.error.message,
          stack: payload.error.stack,
        }
      : payload.error;

  console.log("[AI_TRACE]", {
    timestamp: stamp,
    ...payload,
    error: safeError,
  });
}
