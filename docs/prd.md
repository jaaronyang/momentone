# PRD: Momentone

| Field | Value |
|-------|--------|
| **Status** | Draft |
| **Date** | 2026-08-01 |
| **Product** | Momentone |
| **Related** | [RFC: Momentone technical design](./rfc.md) |

## 1. Summary

Momentone is a web app for **deep work**: research-informed focus soundscapes, with an **optional** Pomodoro timer.

The project is personally motivated by the author’s ADHD and difficulty sustaining focus. The same design — low-distraction audio and optional work/break structure — should also help anyone who wants deeper focus blocks. It is not an ADHD-only or medical product.

Name: **momentum + tone**.

## 2. Problem

Starting and sustaining deep work is hard for many people, and especially hard with ADHD: attention drifts, starting is costly, and ordinary music often pulls focus instead of holding it. Purpose-built focus audio (e.g. Brain.fm) helps, but it is a paid service. Momentone is a **simple alternative**: research-informed focus soundscapes the author can run themselves, with an optional Pomodoro timer (work → break → work) when they want that structure — instead of “press play and hope” on a commercial playlist.

## 3. Goals

1. Let a user start focus audio in one gesture and keep it playing indefinitely until they pause or stop.
2. Let a user optionally enable Pomodoro and stay in a work/break loop without managing a playlist.
3. Provide continuous, non-distracting focus audio with a controllable **modulation depth** inspired by published amplitude-modulation research.
4. When Pomodoro is on and a break starts, keep the **same** soundscape at lower volume so continuity is preserved without deep-focus intensity.
5. Ship a web app suitable for a workshop tryout (author + a few peers) on a free hosting tier.
6. Stay honest: research-informed product for focus and deep work — **not** a medical device or treatment for any condition.

## 4. Non-goals (v1)

- Authentication, user accounts, billing, or analytics platforms
- Calm / sleep / multi-mode catalog (Focus only)
- Curated or AI-generated track library (deferred; see roadmap)
- Native apps, mandatory offline/PWA
- Clinical claims, diagnosis support, or “Brain.fm clone” patent-equivalent claims
- Paid third-party music APIs (e.g. Suno) in v1
- Marketing as an ADHD-only or accessibility-prescription product
- Requiring a timer to use the audio

## 5. Users & context

| Persona | Need |
|---------|------|
| **Author (primary)** | ADHD-informed personal focus companion; workshop demo |
| **Deep-work user** | Low-distraction audio, with or without a timer, with or without ADHD |
| **Workshop peer** | Open a link, try a session, no setup |

**Constraints:** Demo audience is small; prefer free-tier services; implementation happens in a later session.

## 6. User stories

1. As a user, I can open the site, press Start, and hear focus audio play indefinitely (no timer required).
2. As a user, I can turn Pomodoro on or off; when off, no countdown or phase changes run.
3. As a user, when Pomodoro is on, I can set work and break durations (defaults 25 / 5 minutes).
4. As a user, I can adjust volume and modulation depth during playback without interrupting the sound (or the timer, if enabled).
5. When Pomodoro is on and a work block ends, I get a clear phase change and the audio becomes quieter for the break (same texture).
6. When a break ends, work intensity returns and the next work block starts.
7. As a user, I can pause/resume; when Pomodoro is on, I can also skip to the next phase.
8. As a returning user on the same browser, my prefs (including Pomodoro on/off) are remembered.

## 7. Primary flows

**A. Continuous play (default path)**

1. Land on idle screen → optional prefs → **Start** (user gesture unlocks audio).
2. Focus audio plays at chosen intensity with no countdown.
3. User may pause, resume, adjust controls, or stop at any time.

**B. Pomodoro (optional)**

1. Enable Pomodoro → set optional durations → **Start**.
2. **Work:** focus audio at work level; countdown visible.
3. Phase end → optional soft cue → **Break:** same engine, ducked volume.
4. Break end → next **Work**.
5. User may pause, skip phase, disable Pomodoro (return to continuous play), or stop.

## 8. Functional requirements

| ID | Requirement |
|----|-------------|
| F1 | Single mode: **Focus** |
| F2 | Playback modes: **continuous** (indefinite) and **Pomodoro** (optional); user can choose either |
| F3 | When Pomodoro is on: phases idle → work → break → work…; configurable work/break lengths |
| F4 | Pomodoro defaults: 25 min work, 5 min break |
| F5 | Generative in-browser focus soundscape (no media library required for v1) |
| F6 | Controls: play/pause, master volume, modulation depth; optional Soft / Standard / Strong texture preset; skip phase only when Pomodoro is on |
| F7 | When Pomodoro break is active: same graph, quieter (not silence, not a second mode) |
| F8 | Persist prefs across visits on the same browser (including Pomodoro on/off) |
| F9 | Deploy as a static site; no auth |
| F10 | Clear message if Web Audio is unsupported |
| F11 | Product copy must not claim medical treatment or guaranteed clinical outcomes |

## 9. Content strategy

| Phase | Audio source | Notes |
|-------|--------------|--------|
| **v1** | Procedural / generative (in-browser) | Free; infinite sessions; iterate by ear |
| **v1.1 (optional)** | A few curated seamless loops as static files | Free RF packs or self-made files under `/public/beds/`; **no backend required** for a small set |
| **Later (optional)** | AI-assisted beds (e.g. paid Suno) | Only if desired; still can host as static assets until scale demands otherwise |

## 10. Research positioning (product-level)

**What we apply**

- Prefer **non-attention-grabbing** beds (stable harmony, limited novelty, filtered highs) over typical playlist music.
- Offer **amplitude modulation depth** in a focus-oriented rate range (~12–20 Hz band used in published functional-music work), user-controllable so individuals can tune comfort vs intensity.
- Offer **optional external structure** (Pomodoro) for users who want a clear start, sustain, and recovery rhythm — without requiring it for audio playback.

**Evidence we lean on (high level)**

- Functional music with rapid amplitude modulation has been studied for sustained attention across listeners; some work reports larger gains for people with higher ADHD symptom scores (e.g. Woods et al., *Communications Biology*, 2024). That supports inclusive design (modulation + low distraction), not an ADHD-only product.
- Brain.fm publicly describes neural phase-locking via modulation embedded in music and argues this is distinct from classic binaural-beat approaches. Momentone is **inspired by** that class of technique, not a reimplementation of any proprietary stack.

**What we do not claim**

- Momentone does not diagnose, treat, or cure ADHD or any other condition.
- Momentone does not claim equivalence to Brain.fm’s patented systems or published effect sizes.
- Binaural beats are **not** the core product story (evidence is mixed); optional experiments must not dominate marketing copy.

## 11. Success criteria (v1 demo)

- Author can play focus audio indefinitely without enabling Pomodoro.
- Author completes at least one full **work → break → work** cycle with Pomodoro on without fighting the UI.
- At least one workshop peer can use the deployed link with no install steps.
- Low vs high modulation depth is audibly different.
- With Pomodoro on, break ducking is obvious but continuous (same texture, quieter).
- Copy and README state non-medical, deep-work positioning clearly.

## 12. Roadmap

| Version | Scope |
|---------|--------|
| **v1** | Generative Focus + optional Pomodoro + static deploy (workshop demo) |
| **v1.1** | Optional static curated beds into the same FX path |
| **Later** | Extra modes, auth, paid AI content, native — only if product direction expands |

## 13. Open questions (non-blocking)

- Exact Soft / Standard / Strong preset tunings (decide during implementation listen passes).
- Host: Cloudflare Pages vs Vercel (both acceptable free tiers; pick at deploy time).
- Whether a long-break every N cycles is worth a tiny addition after the demo.
- Default for Pomodoro on first visit: off (continuous) vs on — recommend **off** so audio-first matches Brain.fm-like use.

## 14. Doc map

- **This PRD** — what and why.
- **[RFC](./rfc.md)** — how (architecture, stack, audio graph, risks, testing).
