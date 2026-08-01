# PRD: Momentone

| Field | Value |
|-------|--------|
| **Status** | Draft |
| **Date** | 2026-08-01 |
| **Product** | Momentone |
| **Related** | [RFC: Momentone technical design](./rfc.md) |

## 1. Summary

Momentone is a web app for ADHD-friendly deep work: **research-informed focus soundscapes** plus a **Pomodoro timer**. v1 is a workshop demo — generative audio in the browser, shareable via a public URL, no accounts.

Name: **momentum + tone** (Tone.js-powered audio).

## 2. Problem

Starting and sustaining focus is hard with ADHD. Playlist apps interrupt with skips, vocals, and novelty. Tools like Brain.fm help by providing purpose-built focus audio, but Momentone’s author wants a **personal, demable** version that also structures work with Pomodoro (work → break → work) instead of “press play and hope.”

## 3. Goals

1. Let a user start a focus session in one gesture and stay in a work/break loop without managing a playlist.
2. Provide continuous, non-distracting focus audio with a controllable **modulation depth** inspired by published amplitude-modulation research.
3. On breaks, keep the **same** soundscape at lower volume so continuity is preserved without deep-focus intensity.
4. Ship a shareable web demo for a workshop (author + a few peers) on a free hosting tier.
5. Stay honest: research-informed product, **not** a medical device or ADHD treatment.

## 4. Non-goals (v1)

- Authentication, user accounts, billing, or analytics platforms
- Calm / sleep / multi-mode catalog (Focus only)
- Curated or AI-generated track library (deferred; see roadmap)
- Native apps, mandatory offline/PWA
- Clinical claims, diagnosis support, or “Brain.fm clone” patent-equivalent claims
- Paid third-party music APIs (e.g. Suno) in v1

## 5. Users & context

| Persona | Need |
|---------|------|
| **Author (primary)** | Reliable focus companion for personal work; demo for workshop |
| **Workshop peer** | Open a link, try a session, no setup |

**Constraints:** Demo audience is small; prefer free-tier services; implementation happens in a later session.

## 6. User stories

1. As a user, I can open the site, press Start, and hear focus audio while a work timer runs.
2. As a user, I can set work and break durations (defaults 25 / 5 minutes).
3. As a user, I can adjust volume and modulation depth during a session without losing the timer.
4. When a work block ends, I get a clear phase change and the audio becomes quieter for the break (same texture).
5. When a break ends, work intensity returns and the next work block starts.
6. As a user, I can pause/resume and skip to the next phase.
7. As a returning user on the same browser, my duration and control prefs are remembered (`localStorage`).

## 7. Primary flow

1. Land on idle screen → set optional prefs → **Start session** (user gesture unlocks audio).
2. **Work:** generative focus at chosen intensity; countdown visible.
3. Phase end → optional soft cue → **Break:** same engine, ducked volume.
4. Break end → next **Work**.
5. User may pause, skip phase, or end session at any time.

## 8. Functional requirements

| ID | Requirement |
|----|-------------|
| F1 | Single mode: **Focus** |
| F2 | Pomodoro phases: idle → work → break → work…; configurable work/break lengths |
| F3 | Defaults: 25 min work, 5 min break |
| F4 | Generative in-browser focus soundscape (no media library required for v1) |
| F5 | Controls: play/pause, skip phase, master volume, modulation depth; optional Soft / Standard / Strong texture preset |
| F6 | Break audio: same graph, quieter (not silence, not a second mode) |
| F7 | Persist prefs in `localStorage` |
| F8 | Deploy as static site; shareable URL; no auth |
| F9 | Clear message if Web Audio is unsupported |
| F10 | Product copy must not claim medical treatment or guaranteed clinical outcomes |

## 9. Content strategy

| Phase | Audio source | Notes |
|-------|--------------|--------|
| **v1** | Procedural / generative (Tone.js) | Free; infinite sessions; iterate by ear |
| **v1.5 (optional)** | A few curated seamless loops as static files | Free RF packs or self-made files under `/public/beds/`; **no backend required** for a small set |
| **Later (optional)** | AI-assisted beds (e.g. paid Suno) | Only if desired; still can host as static assets until scale demands otherwise |

## 10. Research positioning (product-level)

**What we apply**

- Prefer **non-attention-grabbing** beds (stable harmony, limited novelty, filtered highs) over typical playlist music.
- Offer **amplitude modulation depth** in a focus-oriented rate range (~12–20 Hz band used in published functional-music work), user-controllable so individuals can tune comfort vs intensity.
- Combine audio with **external structure** (Pomodoro), which helps ADHD workflows even when audio alone is imperfect.

**Evidence we lean on (high level)**

- Functional music with rapid amplitude modulation has been studied for sustained attention; effects can be stronger for listeners with higher ADHD symptom scores (e.g. Woods et al., *Communications Biology*, 2024 — rapid modulation in music).
- Brain.fm publicly describes neural phase-locking via modulation embedded in music and argues this is distinct from (and stronger than) classic binaural-beat approaches. Momentone is **inspired by** that class of technique, not a reimplementation of any proprietary stack.

**What we do not claim**

- Momentone does not diagnose, treat, or cure ADHD.
- Momentone does not claim equivalence to Brain.fm’s patented systems or published effect sizes.
- Binaural beats are **not** the core product story (evidence is mixed); optional experiments must not dominate marketing copy.

## 11. Success criteria (v1 demo)

- Author completes at least one full **work → break → work** cycle without fighting the UI.
- At least one workshop peer can use the deployed link with no install steps.
- Low vs high modulation depth is audibly different.
- Break ducking is obvious but continuous (same texture, quieter).
- Copy and README state non-medical positioning clearly.

## 12. Roadmap

| Version | Scope |
|---------|--------|
| **v1** | Generative Focus + Pomodoro + static deploy (workshop demo) |
| **v1.5** | Optional static curated beds into the same FX path |
| **Later** | Extra modes, auth, paid AI content, native — only if product direction expands |

## 13. Open questions (non-blocking)

- Exact Soft / Standard / Strong preset tunings (decide during implementation listen passes).
- Host: Cloudflare Pages vs Vercel (both acceptable free tiers; pick at deploy time).
- Whether a long-break every N cycles is worth a tiny addition after the demo.

## 14. Doc map

- **This PRD** — what and why.
- **[RFC](./rfc.md)** — how (architecture, stack, audio graph, risks, testing).
