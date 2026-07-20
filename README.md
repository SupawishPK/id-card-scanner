# Production-ready ID Card Scanner

Next.js App Router + TypeScript scanner that performs ROI motion/detail analysis entirely in the browser. When the card is stable, the capture button is enabled for an intentional manual capture. It does not send camera frames to a server and has no CV/AI runtime dependency.

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

Tune the motion, variance, and edge thresholds in `hooks/use-id-card-scanner.ts` after testing target devices and lighting. Pixel heuristics verify motion and visual detail; they do not authenticate a card or validate its contents.
# id-card-scanner
