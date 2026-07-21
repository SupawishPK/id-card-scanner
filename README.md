# Production-ready ID Card Scanner

An in-browser ID card scanner built with Next.js, TypeScript, and the Canvas API. It detects a card-shaped object, checks its position and stability, and enables manual capture—without an AI model, computer-vision library, or server upload.

## How it works

```text
┌──────────────────────┐
│   Open rear camera   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Place card inside    │◄──────────────────────────────┐
│ the ID-1 guide       │                               │
└──────────┬───────────┘                               │
           ▼                                           │
     ┌───────────────┐                                 │
     │ Card detected?│── No ──► [WHITE guide] ─────────┤
     └───────┬───────┘                                 │
             │ Yes                                     │
             ▼                                         │
  ┌────────────────────────┐                           │
  │ Aligned with at least  │── No ──► [RED guide] ─────┤
  │ 80% coverage?          │                           │
  └───────────┬────────────┘                           │
              │ Yes                                    │
              ▼                                        │
       ┌───────────────┐                                │
       │ Stable briefly?│── No ──► [RED guide] ─────────┘
       └───────┬───────┘
               │ Yes
               ▼
     ┌─────────────────────┐
     │ [GREEN guide]       │
     │ Capture enabled     │
     └──────────┬──────────┘
                ▼
       ┌─────────────────┐
       │ User taps       │
       │ capture         │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Crop card ROI   │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Validate image  │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │ Result          │
       └────┬───────┬────┘
            │ Pass  │ Fail
            ▼       ▼
  ┌──────────────┐  ┌──────────────┐
  │ Show image   │  │ Show error   │
  └──────────────┘  └──────┬───────┘
                           ▼
                     [Retry scan]
```

In short: **open camera → align card → hold still → capture → validate → success or retry**.

## Detection at a glance

- **Find the card:** Four-side edges, four corners, luminance contrast, ID-1 aspect ratio, and frame coverage are combined into a confidence score.
- **Check stability:** Mean Absolute Difference (MAD) measures motion between consecutive frames.
- **Prevent flicker:** Hysteresis and a short readiness hold keep the UI stable during small hand movements.
- **Stay lightweight:** ROI processing, frame sampling, and pixel skipping reduce mobile CPU and power usage.
- **Create the result:** Canvas crops the guide area and exports it as a JPEG image.

This scanner detects only a **card-shaped object**. It does not read card data, confirm that the object is a genuine ID card, or validate the information printed on it.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access requires `https://` in production (localhost is allowed by browsers).

## GitHub Pages

Pushes to `main` automatically build and deploy the static export to:

`https://supawishpk.github.io/id-card-scanner/`

The workflow supplies `NEXT_PUBLIC_BASE_PATH=/id-card-scanner`, runs the type check and static build, then publishes `out/` through GitHub Pages Actions. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Integration

```tsx
<IdCardScanner />
```

The current proof-of-concept validation flow randomly returns success or an incomplete-card error after capture. Replace the timer and random result in `components/id-card-scanner.tsx` with the real validation service before production rollout.

Tune the motion, variance, and edge thresholds in `hooks/use-id-card-scanner.ts` and `lib/id-card-scanner-config.ts` after testing target devices and lighting. Pixel heuristics verify motion and visual detail; they do not authenticate a card or validate its contents.
