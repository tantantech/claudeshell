<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-03 | Updated: 2026-04-03 -->

# providers

## Purpose
Multi-provider AI abstraction layer. Supports 15 providers (Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral, Cohere, MiniMax, Groq, Together, Fireworks, OpenRouter, Ollama, Perplexity, Azure) through a unified streaming interface.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export for all provider types and registry functions |
| `provider.ts` | `AIProvider` interface — unified contract for all providers |
| `registry.ts` | `PROVIDER_CONFIGS`, `MODEL_REGISTRY` — model/provider mappings and resolution |
| `claude.ts` | Anthropic provider — Claude Agent SDK integration |
| `openai.ts` | OpenAI-compatible provider — covers OpenAI, xAI, DeepSeek, Groq, etc. |
| `gemini.ts` | Google Gemini provider — `@google/generative-ai` SDK |

## For AI Agents

### Working In This Directory
- All providers implement the `AIProvider` interface from `provider.ts`
- Most providers use OpenAI-compatible API — only change `baseURL` and `apiKeyEnv`
- Adding a new provider: add to `PROVIDER_CONFIGS` + `MODEL_REGISTRY` in `registry.ts`
- Provider type determines SDK: `claude` → Agent SDK, `openai-compatible` → OpenAI SDK, `gemini` → Google SDK
- All streaming uses `StreamEvent` discriminated union

### Testing Requirements
- Provider tests in `tests/providers.test.ts`
- Mock SDK calls — never hit real APIs in tests

### Common Patterns
- 4-tier provider hierarchy: Big Tech → Major AI → Fast Inference → Aggregators/Local
- Model shorthand resolution: `--opus` → `claude-opus` → `claude-opus-4-6-20250414`
- `getProvider()` factory returns the right `AIProvider` implementation
- Environment variable convention: `<PROVIDER>_API_KEY`

## Dependencies

### Internal
- Consumed by `src/ai.ts` and `src/model-switcher.ts`

### External
- `@anthropic-ai/claude-agent-sdk` — Claude provider
- `openai` — All OpenAI-compatible providers
- `@google/generative-ai` — Gemini provider

<!-- MANUAL: -->
