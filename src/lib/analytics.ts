/**
 * analytics.ts — Typed PostHog event helpers.
 *
 * Every product event goes through this module. No raw `posthog.capture`
 * calls anywhere else — this gives us one place to audit, rename, or mock events.
 *
 * All calls are no-ops until PostHog initialises (the `posthog-js` queue
 * buffers them automatically, so call order doesn't matter).
 */

import posthog from 'posthog-js'

// ── SVG / Upload ──────────────────────────────────────────────────

/** Fired once when a new SVG file is accepted and stored. */
export function trackSvgUploaded(props: {
  fileName:   string
  fileSizeKb: number
  layers:     number
  groups:     number
  hasText:    boolean
}) {
  posthog.capture('svg_uploaded', props)
}

// ── Preset ───────────────────────────────────────────────────────

/** Fired whenever the active preset changes (includes first apply). */
export function trackPresetApplied(props: {
  presetId: string
}) {
  posthog.capture('preset_applied', props)
}

// ── Export modal ─────────────────────────────────────────────────

/** Fired when the export modal is opened. */
export function trackExportModalOpened() {
  posthog.capture('export_modal_opened')
}

/** Fired the moment the user clicks "Export to file". */
export function trackExportStarted(props: {
  format:    string
  quality?:  number
  fps?:      number
}) {
  posthog.capture('export_started', props)
}

/** Fired when the export pipeline completes successfully. */
export function trackExportCompleted(props: {
  format:      string
  durationMs:  number
}) {
  posthog.capture('export_completed', props)
}

/** Fired when the export pipeline throws or reports an error. */
export function trackExportFailed(props: {
  format:  string
  reason:  string
}) {
  posthog.capture('export_failed', props)
}

// ── Share ─────────────────────────────────────────────────────────

/** Fired when a share token is successfully created and copied. */
export function trackShareLinkCreated() {
  posthog.capture('share_link_created')
}

/** Fired when a visitor opens a /s/[token] preview page. */
export function trackSharePreviewViewed() {
  posthog.capture('share_preview_viewed')
}

// ── AI Prompt Bar ─────────────────────────────────────────────────

/** Fired when the user submits a natural-language prompt to the AI bar. */
export function trackAiPromptSubmitted(props: {
  promptLength:    number
  hasActivePreset: boolean
}) {
  posthog.capture('ai_prompt_submitted', props)
}

/** Fired when the AI returns a successful preset and parameter set. */
export function trackAiPromptSucceeded(props: {
  presetId:    string
  promptLength: number
}) {
  posthog.capture('ai_prompt_succeeded', props)
}

/** Fired when the AI request fails or returns an error. */
export function trackAiPromptFailed(props: {
  reason: string
}) {
  posthog.capture('ai_prompt_failed', props)
}

// ── Library ───────────────────────────────────────────────────────

/** Fired when the user selects a template from the SVG library. */
export function trackLibraryItemSelected(props: {
  itemId:   string
  itemName: string
  category: string
  source:   'editor' | '3d'
}) {
  posthog.capture('library_item_selected', props)
}

// ── 3D mode ───────────────────────────────────────────────────────

/** Fired when a file is uploaded into 3D mode. */
export function trackThreedAssetUploaded(props: {
  assetKind: 'svg' | 'image'
  fileName:  string
}) {
  posthog.capture('threed_asset_uploaded', props)
}

/** Fired when a 3D export render begins. */
export function trackThreedExportStarted(props: {
  format: 'gif' | 'webm'
}) {
  posthog.capture('threed_export_started', props)
}

/** Fired when a 3D export finishes and the file is downloaded. */
export function trackThreedExportCompleted(props: {
  format: 'gif' | 'webm'
}) {
  posthog.capture('threed_export_completed', props)
}
