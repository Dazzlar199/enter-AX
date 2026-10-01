import { pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

export interface TranscriptChunk {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  chunks: TranscriptChunk[];
}

const MODEL_ID = process.env.WHISPER_MODEL ?? "Xenova/whisper-base";

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

/** Lazily loads (and caches) the local Whisper ASR pipeline. Fully offline after the first download. */
function getTranscriber(): Promise<AutomaticSpeechRecognitionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline("automatic-speech-recognition", MODEL_ID) as Promise<AutomaticSpeechRecognitionPipeline>;
  }
  return pipelinePromise;
}

export async function transcribeAudio(samples: Float32Array): Promise<TranscriptResult> {
  const transcriber = await getTranscriber();
  const output = await transcriber(samples, {
    language: "korean",
    task: "transcribe",
    return_timestamps: true,
    chunk_length_s: 30,
  });

  const result = Array.isArray(output) ? output[0] : output;
  const rawChunks = (result as { chunks?: Array<{ timestamp: [number, number | null]; text: string }> }).chunks ?? [];

  return {
    text: (result.text ?? "").trim(),
    chunks: rawChunks.map((chunk) => ({
      start: chunk.timestamp[0] ?? 0,
      end: chunk.timestamp[1] ?? chunk.timestamp[0] ?? 0,
      text: chunk.text.trim(),
    })),
  };
}
