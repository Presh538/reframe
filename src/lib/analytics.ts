/**
 * analytics.ts — Typed PostHog event helpers.
 *
 * Every product event goes through this module. No raw `posthog.capture`
 * calls anywhere else — this gives us one place to audit, rename, or mock events.
 *
 * Calls made before PostHog has loaded are queued and replayed in order,
 * so call order doesn't matter.
 */

import { withPostHog } from '@/lib/posthog-client'

/** Queued until PostHog loads (see posthog-client), then sent in order. */
function capture(event: string, props?: Record<string, unknown>) {
  withPostHog(posthog => posthog.capture(event, props))
}

// ── SVG / Upload ──────────────────────────────────────────────────

/** Fired once when a new SVG file is accepted and stored. */
export function trackSvgUploaded(props: {
  fileName:   string
  fileSizeKb: number
  layers:     number
  groups:     number
  hasText:    boolean
}) {
  capture('svg_uploaded', props)
}

// ── Preset ───────────────────────────────────────────────────────

/** Fired whenever the active preset changes (includes first apply). */
export function trackPresetApplied(props: {
  presetId: string
}) {
  capture('preset_applied', props)
}

// ── Export modal ─────────────────────────────────────────────────

/** Fired when the export modal is opened. */
export function trackExportModalOpened() {
  capture('export_modal_opened')
}

/** Fired the moment the user clicks "Export to file". */
export function trackExportStarted(props: {
  format:    string
  quality?:  number
  fps?:      number
}) {
  capture('export_started', props)
}

/** Fired when the export pipeline completes successfully. */
export function trackExportCompleted(props: {
  format:      string
  durationMs:  number
}) {
  capture('export_completed', props)
}

/** Fired when the export pipeline throws or reports an error. */
export function trackExportFailed(props: {
  format:  string
  reason:  string
}) {
  capture('export_failed', props)
}

// ── Share ─────────────────────────────────────────────────────────

/** Fired when a share token is successfully created and copied. */
export function trackShareLinkCreated() {
  capture('share_link_created')
}

/** Fired when a visitor opens a /s/[token] preview page. */
export function trackSharePreviewViewed() {
  capture('share_preview_viewed')
}

// ── AI Prompt Bar ─────────────────────────────────────────────────

/** Fired when the user submits a natural-language prompt to the AI bar. */
export function trackAiPromptSubmitted(props: {
  promptLength:    number
  hasActivePreset: boolean
}) {
  capture('ai_prompt_submitted', props)
}

/** Fired when the AI returns a successful preset and parameter set. */
export function trackAiPromptSucceeded(props: {
  presetId:    string
  promptLength: number
}) {
  capture('ai_prompt_succeeded', props)
}

/** Fired when the AI request fails or returns an error. */
export function trackAiPromptFailed(props: {
  reason: string
}) {
  capture('ai_prompt_failed', props)
}

// ── Library ───────────────────────────────────────────────────────

/** Fired when the user selects a template from the SVG library. */
export function trackLibraryItemSelected(props: {
  itemId:   string
  itemName: string
  category: string
  source:   'editor' | '3d'
}) {
  capture('library_item_selected', props)
}

// ── 3D mode ───────────────────────────────────────────────────────

/** Fired when a file is uploaded into 3D mode. */
export function trackThreedAssetUploaded(props: {
  assetKind: 'svg' | 'image'
  fileName:  string
}) {
  capture('threed_asset_uploaded', props)
}

/** Fired when a 3D export render begins. */
export function trackThreedExportStarted(props: {
  format: 'gif' | 'webm'
}) {
  capture('threed_export_started', props)
}

/** Fired when a 3D export finishes and the file is downloaded. */
export function trackThreedExportCompleted(props: {
  format: 'gif' | 'webm'
}) {
  capture('threed_export_completed', props)
}
