"use client";

import { useState } from "react";
import { IdCardScanner } from "@/components/id-card-scanner";
import { ScannerIntroScreen } from "@/components/scanner-intro-screen";

export default function Home() {
  const [activeStep, setActiveStep] = useState<"intro" | "scanner">("intro");

  return (
    <main className="min-h-dvh bg-slate-950 sm:grid sm:place-items-center sm:p-6">
      {activeStep === "intro" ? (
        <ScannerIntroScreen onStart={() => setActiveStep("scanner")} />
      ) : (
        <IdCardScanner onBack={() => setActiveStep("intro")} />
      )}
    </main>
  );
}
