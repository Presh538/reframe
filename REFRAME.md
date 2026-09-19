# Reframe

**Turn static SVGs into motion in seconds.**

Reframe is a free, browser-based SVG animator. Upload an SVG, describe the motion you want in plain English (or pick a preset), fine-tune it, and export a polished animation — no After Effects, no plugins, no code, no account.

- **Live:** [reframeo.com](https://reframeo.com)
- **Built by:** [Precious Ogar](https://www.prefolio.work/)

---

## The problem

Most graphics spend their entire lives standing still. Motion makes a logo, icon, or illustration feel alive — but getting there usually means timelines, keyframes, plugins, or expensive software like After Effects. Producing a Lottie file is even harder: it traditionally requires After Effects plus the Bodymovin plugin.

That friction is why most SVGs never get animated.

## The solution

Reframe reduces motion design to a few decisions:

1. **Upload** an SVG (or start from the built-in library)
2. **Animate** — type a prompt like *"make it float gently"* or pick a preset
3. **Tune** speed, delay, easing, loop, direction, and which elements move
4. **Export** or share a link

Everything runs in the browser. There's nothing to install and no sign-up.

---

## Features

### AI prompt animation
Describe the motion in natural language and the AI picks and tunes the right preset — including parameters like speed, easing, and whether elements animate together or one at a time. Responses are schema-constrained, so the AI can only choose real presets with valid settings.

### Presets
**35 hand-crafted 2D presets** across four categories:

| Category | Style | Examples |
|---|---|---|
| **Logo** | Entrances & reveals | Draw On, Bounce In, Blur Rise, Fill Reveal, Cascade |
| **Icon** | Loops & micro-interactions | Pulse, Spin, Tada, Flip, Glow Pulse |
| **Illustration** | Organic, layered motion | Float, Wave Path, Parallax Drift, Liquid Morph |
| **UI** | Interface patterns | Checkmark Draw, Loading Spin, Typewriter, Progress Fill |

### Fine-grained controls
Speed, start delay, easing (linear → spring/back/snappy), loop mode (play once / loop / bounce), direction (in / out / in & out), and target scope (all / groups / individual paths). Smart auto-grouping makes staggered animations work even on flat SVGs.

### 3D mode
Turn an SVG or image into a 3D object with **14 3D presets**, exportable as GIF, WebM, or embeddable code.

### Export formats
| Format | Use it for |
|---|---|
| **GIF** | Anywhere — Slack, email, X, README files. Transparent background supported. |
| **WebM** | Lightweight video for web and social |
| **Lottie JSON** | Web and mobile apps (lottie-web, lottie-react, any Lottie player). Spec-validated against the official Lottie schema. |
| **Embed** | Paste-ready HTML |
| **CSS** | *Coming soon* |

Quality and frame rate are adjustable for GIF and WebM.

### Shareable links
Generate a short link to a live, playing preview of your animation. Links expire after 7 days.

### SVG library
A built-in set of starter SVGs to animate right away.

---

## Who it's for

- **Designers** who want motion without learning a motion tool
- **Developers** who need production-ready Lottie, GIF, or embeds
- **Marketers & creators** animating logos and graphics for launches, social posts, and decks

---

## Why it's different

- **No After Effects path to Lottie.** Reframe exports spec-valid Lottie straight from an SVG in the browser.
- **AI-first, not AI-only.** Prompt it, then take full manual control.
- **Zero friction.** Free, no install, no account.
- **Private by default.** SVGs are processed in your browser.

---

## Tech overview

| Layer | Stack |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 18, TypeScript |
| State & motion | Zustand, Motion |
| 3D | Three.js |
| AI | Vercel AI SDK + Anthropic Claude |
| Storage | Vercel Blob (share links) |
| Analytics | PostHog (product analytics, session replay, error tracking) |
| Hosting | Vercel |

**Security:** layered SVG sanitization (DOMPurify allowlist + server-side sanitizer), strict Content Security Policy, rate-limited API routes, and no secrets exposed to the client.

---

## Roadmap

- **Text animations** — character, word, and line-level effects for live `<text>`
- **More object presets**, regrouped by intent (Entrance, Reveal, Emphasis, Idle)
- **CSS export**
- **Pro tier** — premium presets, larger uploads, higher AI limits
