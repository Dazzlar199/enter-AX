import { afterEach, describe, expect, it, vi } from "vitest";

import { generateText, resolveProvider } from "./llm";

describe("resolveProvider", () => {
  it("prefers Gemini only when a key or explicit provider is set", () => {
    expect(resolveProvider({})).toBe("ollama");
    expect(resolveProvider({ GEMINI_API_KEY: "k" })).toBe("gemini");
    expect(resolveProvider({ GEMINI_API_KEY: "k", LLM_PROVIDER: "ollama" })).toBe("ollama");
    expect(resolveProvider({ LLM_PROVIDER: "gemini" })).toBe("gemini");
  });
});

describe("generateText with Gemini", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the key as a header and joins response parts", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: "1}" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateText({ prompt: "hi", json: true })).resolves.toBe('{"a":1}');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(JSON.parse(init.body as string).generationConfig.responseMimeType).toBe("application/json");
  });

  it("reports status without leaking the response body", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret detail", { status: 403 })));

    const error = await generateText({ prompt: "hi" }).catch((e: Error) => e);
    expect((error as Error).message).toMatch(/403/);
    expect((error as Error).message).not.toMatch(/secret detail/);
  });
});
