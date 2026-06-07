<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into Reframe. The project already had `posthog-js` installed, a `PostHogProvider` wrapping the app in `layout.tsx`, and two live events (`svg_uploaded`, `preset_applied`) firing via `EditorAnalytics`. The wizard wired up six previously-defined-but-uncalled event helpers, added three brand-new AI prompt events, set the PostHog environment variables in `.env.local`, and created a dashboard with five insights.

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `export_modal_opened` | Fired when the Export button is clicked and the modal opens | `src/components/editor/TopBar.tsx` |
| `export_started` | Fired when the user clicks "Export to file", with `format`, `quality`, `fps` | `src/components/editor/TopBar.tsx` |
| `export_completed` | Fired when the export pipeline succeeds, with `format` and `durationMs` | `src/lib/export/runExport.ts` |
| `export_failed` | Fired when the export pipeline throws, with `format` and `reason` | `src/lib/export/runExport.ts` |
| `share_link_created` | Fired after a share token is created and copied to clipboard | `src/components/editor/TopBar.tsx` |
| `share_preview_viewed` | Fired when a visitor loads a `/s/[token]` preview page | `src/app/s/[token]/PreviewCanvas.tsx` |
| `ai_prompt_submitted` | Fired when a natural-language prompt is submitted, with `promptLength` and `hasActivePreset` | `src/components/editor/AIPromptBar.tsx` |
| `ai_prompt_succeeded` | Fired when the AI returns a preset, with `presetId` and `promptLength` | `src/components/editor/AIPromptBar.tsx` |
| `ai_prompt_failed` | Fired when the AI request errors, with `reason` | `src/components/editor/AIPromptBar.tsx` |

Already tracked before this session (unchanged):

| Event | Description | File |
|-------|-------------|------|
| `svg_uploaded` | Fired on new SVG upload, with file size, layer count, etc. | `src/components/EditorAnalytics.tsx` |
| `preset_applied` | Fired when the active preset changes | `src/components/EditorAnalytics.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/457829/dashboard/1679416)
- [SVG Upload → Export Funnel (wizard)](https://us.posthog.com/project/457829/insights/K9CPCEfl) — Conversion funnel: how many users who upload an SVG go on to export
- [Export Volume by Format (wizard)](https://us.posthog.com/project/457829/insights/QjGzhyjq) — Which export formats (GIF, WebM, CSS, Lottie) are most popular
- [AI Prompt Usage (wizard)](https://us.posthog.com/project/457829/insights/O0QCgBfu) — AI prompt submitted, succeeded, and failed counts over time
- [Share Links Created vs Previewed (wizard)](https://us.posthog.com/project/457829/insights/rGg2C7SA) — Share link virality: how many links are created vs how many previews are actually viewed
- [Export Success vs Failure (wizard)](https://us.posthog.com/project/457829/insights/R9dFgouF) — Export pipeline reliability: completed vs failed exports

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
