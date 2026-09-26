# Ch1mpleo – Visual Portfolio

A personal corner of the internet where I have fun, experiment with creative dev stuff, and show off my love for video games.

Orginal idea come from [Wodniack] — remixed and made my own.

---

## What this is

This isn't a formal portfolio. It's a playground.

I'm a **Gamer and Developer** who codes by day and games by night. This site is where those two worlds collide — a space to try out wild animations, experiment with design, and keep a piece of the internet that feels like *me*.

---

## Stack

- [Astro](https://astro.build) — static site framework
- [GSAP](https://gsap.com/) — animations
- [Lenis](https://lenis.darkroom.engineering/) — smooth scrolling
- Vanilla SCSS — styling

## Run locally

```bash
git clone https://github.com/Ch1mpleo/visual-portfolio.git
npm install
npm run dev
```

## GOAT video assets

The original edits live in `src/assets/goats/` and play at their original quality in the popup. The smaller, streaming-friendly copies in `public/goats/full/` play silently on the gallery cards. Opening a card starts the original video from the beginning with sound and controls; closing it resumes the card where it paused. Card videos load as they enter the scene, and posters cover the short wait before playback begins.

To regenerate the delivery files after adding or replacing a source video, install FFmpeg and run:

```bash
node scripts/optimize-goat-videos.mjs
```

The script accepts an FFmpeg executable path as its first argument if it is not on `PATH`. Keep the video list in `scripts/optimize-goat-videos.mjs` and `src/components/SWork.astro` in sync.

---

*Made with ☕, late nights, and too many game references.*
