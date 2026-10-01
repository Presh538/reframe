# PostHog AI Observability setup

## Status

**Wired, build-verified, and awaiting a live AI request.** The setup was not exercised against Anthropic because no provider credential or model request was run during this integration.

## Integration

- **Selected workflow:** Vercel AI SDK (Node).
- **Compatibility path:** The project uses `ai` 6.x, so the route uses PostHog's legacy `withTracing` Vercel AI wrapper rather than the v7-only OpenTelemetry integration.
- **Package added:** `@posthog/ai` `^8.13.4` in `package.json`.
- **Existing PostHog setup:** Reused unchanged. The AI wrapper receives the existing server client, which reads `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` from the environment.
- **Environment:** Both existing PostHog environment variables are configured in `.env.local`; this integration adds no token or host literals to source code.

## Instrumented LLM call

`src/app/api/ai-animate/route.ts` now wraps the existing Anthropic Vercel AI model with `withTracing`.

Each `POST /api/ai-animate` request sends:

- a new `posthogTraceId` for the request/turn;
- an `$ai_session_id` supplied by the browser and retained for the lifetime of the mounted editor prompt bar, grouping successive animation prompts into one AI session;
- the authenticated app user's stable internal ID as `posthogDistinctId` when the metering layer resolves one; guest requests remain anonymous;
- `posthogCaptureImmediate: true` so the serverless route delivers telemetry before it exits.

The route registers no Vercel AI tools, so there are no custom tool spans to add. The Vercel AI wrapper captures the single generation made by each turn.

## How to verify live delivery

1. Run the app with `npm run dev`.
2. Open an SVG editor page and submit an animation instruction using the **Refine your animation…** prompt bar.
3. Submit a second instruction without reloading the editor.
4. In PostHog, open **AI Observability → Traces** and inspect the newest generation/trace.

Expected result:

- one generation per prompt;
- one trace per prompt;
- both traces grouped under the same `$ai_session_id` until the editor component is remounted;
- an identified person for signed-in users, and anonymous attribution for guest users;
- Anthropic model, token, latency, input, and output data populated by the wrapper.

Reference: [Vercel AI SDK AI Observability docs](https://posthog.com/docs/ai-observability/installation/vercel-ai)

## Verification completed

- `npm run type-check` — passed.
- `npm run build` — passed, including compilation of `/api/ai-animate`.

## Privacy mode

- **Effective setting:** `posthogPrivacyMode: false` in `src/app/api/ai-animate/route.ts`. Prompt and completion content are therefore captured for this wrapped call.
- **When to change it:** Enable privacy mode before sending prompts or responses that must not be stored in PostHog.
- **How to change it:** Set `posthogPrivacyMode: true` in the `withTracing` options in `src/app/api/ai-animate/route.ts` (or make that value conditional on your application's consent/privacy policy).
- **Effect:** Privacy mode excludes SDK-captured `$ai_input` and `$ai_output_choices`; it does not retroactively remove prior events or automatically sanitize arbitrary custom properties.
- **More information:** [AI Observability privacy mode](https://posthog.com/docs/ai-observability/privacy-mode)
