/**
 * [INPUT]: 依赖 Dify Audio-to-Text API，环境变量 DIFY_API_KEY
 * [OUTPUT]: 对外提供 POST /api/audio-transcribe 端点，音频转文字
 * [POS]: api/ 的音频转录端点，代理请求到 Dify STT
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const config = {
  runtime: "edge",
};

const DIFY_API_BASE = "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!DIFY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Dify API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!audioFile.type.startsWith("audio/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Must be an audio file." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File exceeds maximum size of 2MB" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Forward to Dify Audio-to-Text API
    const difyForm = new FormData();
    difyForm.append("file", audioFile, audioFile.name || "recording.webm");

    const response = await fetch(`${DIFY_API_BASE}/audio-to-text`, {
      method: "POST",
      headers: { Authorization: `Bearer ${DIFY_API_KEY}` },
      body: difyForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dify STT error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Transcription failed" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = (await response.json()) as { text: string };
    return new Response(
      JSON.stringify({ text: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Audio transcribe error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
