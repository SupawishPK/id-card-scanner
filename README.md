# Production-ready ID Card Scanner

Next.js App Router + TypeScript scanner that performs ROI motion/detail analysis entirely in the browser. It does not send camera frames to a server and has no CV/AI runtime dependency.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access requires `https://` in production (localhost is allowed by browsers).

## Integration

```tsx
<IdCardScanner onConfirm={(base64Jpeg) => console.log(base64Jpeg)} />
```

Tune the motion, variance, and edge thresholds in `hooks/use-id-card-scanner.ts` after testing target devices and lighting. Pixel heuristics verify motion and visual detail; they do not authenticate a card or validate its contents.
# id-card-scanner
