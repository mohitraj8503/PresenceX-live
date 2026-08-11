export interface FaceEngineResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data: T | null;
    error: string | null;
  };
}

const DEFAULT_TIMEOUT_MS = 10000;

export async function callFaceEngine<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<FaceEngineResponse<T>> {
  const baseUrl = process.env.FACE_ENGINE_URL || "http://127.0.0.1:8001";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let json;
    try {
      json = await res.json();
    } catch {
      json = {
        success: false,
        data: null,
        error: "invalid_json_response",
      };
    }

    return {
      status: res.status,
      body: json,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errorMsg = isTimeout ? "face_engine_timeout" : "face_engine_unreachable";

    return {
      status: 502,
      body: {
        success: false,
        data: null,
        error: errorMsg,
      },
    };
  }
}
