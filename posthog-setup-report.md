<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Reframe. The project already had solid foundational tracking (SVG uploads, preset changes, exports, AI prompts, share links). This session extended that with library template tracking, 3D mode events, server-side events on both API routes, and a reverse proxy so all PostHog traffic routes through the app's own domain — fixing production CSP compatibility without adding external origins.

## Changes made this session

### Infrastructure
- **`src/lib/posthog-server.ts`** (new) — server-side PostHog Node client singleton for API routes
- **`next.config.mjs`** — added `/ingest/*` reverse proxy rewrites and `skipTrailingSlashRedirect: true`
- **`src/components/providers/PostHogProvider.tsx`** — changed `api_host` to `/ingest` proxy
- **`posthog-node`** — installed as a production dependency

### New events (this session)

| Event | Description | File |
|-------|-------------|------|
| `library_item_selected` | User picks a template from the SVG library (editor or 3D) | `src/components/editor/LibraryBrowser.tsx` |
| `threed_asset_uploaded` | File uploaded into 3D mode via file picker | `src/components/threed/ThreeDMode.tsx` |
| `threed_export_started` | 3D GIF or WebM render begins | `src/components/threed/ThreeDMode.tsx` |
| `threed_export_completed` | 3D GIF or WebM renders and downloads successfully | `src/components/threed/ThreeDMode.tsx` |
| `share_created` | Server-side — share token signed successfully | `src/app/api/share/route.ts` |
| `ai_animate_succeeded` | Server-side — AI animation generation completed | `src/app/api/ai-animate/route.ts` |

### Existing events (previously instrumented, unchanged)

| Event | Description | File |
|-------|-------------|------|
| `svg_uploaded` | SVG file accepted and stored | `src/components/EditorAnalytics.tsx` |
| `preset_applied` | Active preset changed | `src/components/EditorAnalytics.tsx` |
| `export_modal_opened` | Export modal opened | `src/components/editor/TopBar.tsx` |
| `export_started` | User clicked export with format, quality, fps | `src/components/editor/TopBar.tsx` |
| `export_completed` | Export pipeline finished with format and duration | `src/lib/export/runExport.ts` |
| `export_failed` | Export pipeline errored | `src/lib/export/runExport.ts` |
| `share_link_created` | Share URL created and copied to clipboard | `src/components/editor/TopBar.tsx` |
| `share_preview_viewed` | Visitor opened a /s/[token] preview page | `src/app/s/[token]/PreviewCanvas.tsx` |
| `ai_prompt_submitted` | User submitted a natural-language prompt | `src/components/editor/AIPromptBar.tsx` |
| `ai_prompt_succeeded` | AI returned a valid preset and params | `src/components/editor/AIPromptBar.tsx` |
| `ai_prompt_failed` | AI request errored | `src/components/editor/AIPromptBar.tsx` |

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior:

- **Dashboard** — [Analytics basics (wizard)](https://us.posthog.com/project/457829/dashboard/1679447)
- **Export conversion funnel** — [kh2ols24](https://us.posthog.com/project/457829/insights/kh2ols24) — export modal → started → completed
- **SVG uploads over time** — [21qJMe6l](https://us.posthog.com/project/457829/insights/21qJMe6l) — top of funnel
- **AI prompt success vs failure** — [5MOLxL6j](https://us.posthog.com/project/457829/insights/5MOLxL6j) — AI feature reliability
- **Share links created vs previews viewed** — [IQtrBDON](https://us.posthog.com/project/457829/insights/IQtrBDON) — viral reach
- **Most applied presets** — [TyvFZAqj](https://us.posthog.com/project/457829/insights/TyvFZAqj) — preset popularity breakdown

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
