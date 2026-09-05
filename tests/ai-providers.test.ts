import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AI_PROVIDERS,
  cleanJsonText,
  cleanAndParseJson,
  executeAiCall,
  type AiProviderType,
} from "../src/engine/ai/providers";
import { resolveProviderKey } from "../server/generate";

describe("AI Providers Engine", () => {
  describe("Provider Metadata", () => {
    it("supports all 4 core providers: openai, anthropic, groq, gemini", () => {
      const expectedProviders: AiProviderType[] = ["openai", "anthropic", "groq", "gemini"];
      for (const p of expectedProviders) {
        expect(AI_PROVIDERS[p]).toBeDefined();
        expect(AI_PROVIDERS[p].name).toBeTruthy();
        expect(AI_PROVIDERS[p].defaultModel).toBeTruthy();
        expect(AI_PROVIDERS[p].models.length).toBeGreaterThan(0);
        expect(AI_PROVIDERS[p].keyPlaceholder).toBeTruthy();
      }
    });

    it("has proper default models configured", () => {
      expect(AI_PROVIDERS.openai.defaultModel).toBe("gpt-4o-mini");
      expect(AI_PROVIDERS.anthropic.defaultModel).toBe("claude-3-5-sonnet-20241022");
      expect(AI_PROVIDERS.groq.defaultModel).toBe("llama-3.3-70b-versatile");
      expect(AI_PROVIDERS.gemini.defaultModel).toBe("gemini-1.5-flash");
    });
  });

  describe("cleanJsonText and cleanAndParseJson", () => {
    it("handles raw JSON object and arrays", () => {
      const rawObj = '{"status": "ok", "value": 42}';
      expect(cleanAndParseJson(rawObj)).toEqual({ status: "ok", value: 42 });

      const rawArr = '[{"id": "sec1"}, {"id": "sec2"}]';
      expect(cleanAndParseJson(rawArr)).toEqual([{ id: "sec1" }, { id: "sec2" }]);
    });

    it("strips markdown code fences (```json ... ```)", () => {
      const md = "```json\n{\n  \"sections\": [{\"id\": \"overview\"}]\n}\n```";
      expect(cleanJsonText(md)).toBe("{\n  \"sections\": [{\"id\": \"overview\"}]\n}");
      expect(cleanAndParseJson(md)).toEqual({ sections: [{ id: "overview" }] });
    });

    it("extracts JSON when surrounding explanatory text is present", () => {
      const withChatter = "Here is your requested specification:\n```json\n{\"id\": \"test\"}\n```\nHope this helps!";
      expect(cleanAndParseJson(withChatter)).toEqual({ id: "test" });
    });

    it("throws a descriptive error when JSON is invalid", () => {
      expect(() => cleanAndParseJson("not valid json at all")).toThrow(/Failed to parse JSON/);
    });
  });

  describe("executeAiCall with Providers", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("formats OpenAI request correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"success": true}' } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await executeAiCall({
        provider: "openai",
        apiKey: "sk-mock-key",
        systemPrompt: "System prompt",
        userPrompt: "User prompt",
        schema: '{"type":"object"}',
      });

      expect(res).toBe('{"success": true}');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.headers.Authorization).toBe("Bearer sk-mock-key");
      const parsedBody = JSON.parse(init.body);
      expect(parsedBody.model).toBe("gpt-4o-mini");
      expect(parsedBody.response_format).toEqual({ type: "json_object" });
    });

    it("formats Anthropic request correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: '{"claude": "verified"}' }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await executeAiCall({
        provider: "anthropic",
        apiKey: "sk-ant-mock",
        model: "claude-3-5-haiku-20241022",
        systemPrompt: "System instruction",
        userPrompt: "Generate spec",
        schema: '{"type":"object"}',
      });

      expect(res).toBe('{"claude": "verified"}');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(init.headers["x-api-key"]).toBe("sk-ant-mock");
      expect(init.headers["anthropic-version"]).toBe("2023-06-01");
      const parsedBody = JSON.parse(init.body);
      expect(parsedBody.model).toBe("claude-3-5-haiku-20241022");
      expect(parsedBody.max_tokens).toBe(4096);
    });

    it("formats Groq request correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"groq": "fast"}' } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await executeAiCall({
        provider: "groq",
        apiKey: "gsk-mock",
        systemPrompt: "System",
        userPrompt: "User",
      });

      expect(res).toBe('{"groq": "fast"}');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
      expect(init.headers.Authorization).toBe("Bearer gsk-mock");
      const parsedBody = JSON.parse(init.body);
      expect(parsedBody.model).toBe("llama-3.3-70b-versatile");
    });

    it("formats Google Gemini request correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"gemini": "multimodal"}' }] } }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await executeAiCall({
        provider: "gemini",
        apiKey: "AIzaSy-mock",
        systemPrompt: "System instruction",
        userPrompt: "User query",
      });

      expect(res).toBe('{"gemini": "multimodal"}');
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain("generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
      expect(url).toContain("key=AIzaSy-mock");
      const parsedBody = JSON.parse(init.body);
      expect(parsedBody.generationConfig.responseMimeType).toBe("application/json");
      expect(parsedBody.systemInstruction.parts[0].text).toContain("System instruction");
    });

    it("throws if API key is missing", async () => {
      await expect(
        executeAiCall({
          provider: "openai",
          apiKey: "   ",
          systemPrompt: "",
          userPrompt: "",
        }),
      ).rejects.toThrow(/API key is required for provider "openai"/);
    });
  });

  describe("resolveProviderKey", () => {
    it("prioritizes client-provided API key", () => {
      const resolved = resolveProviderKey("openai", "sk-client-key");
      expect(resolved.apiKey).toBe("sk-client-key");
      expect(resolved.envVar).toBe("CLIENT_PROVIDED");
    });

    it("returns correct envVar name for each provider", () => {
      expect(resolveProviderKey("openai").envVar).toBe("OPENAI_API_KEY");
      expect(resolveProviderKey("anthropic").envVar).toBe("ANTHROPIC_API_KEY");
      expect(resolveProviderKey("groq").envVar).toBe("GROQ_API_KEY");
      expect(resolveProviderKey("gemini").envVar).toBe("GEMINI_API_KEY");
    });
  });
});
