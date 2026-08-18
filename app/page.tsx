"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import IdCardScanner from "@/components/IdCardScanner";
import type { IIdCardAnalyzeCode } from "@/api/postIdCardAnalyzeApi";

const Home = () => {
  const router = useRouter();

  const onVerify = async (capturedImage: string): Promise<IIdCardAnalyzeCode> => {
    console.log("[App/API] 🛰️ Verifying ID Card photo in background...");

    // Mock: simulate API response delay between 1000 - 1500 ms
    const delay = Math.floor(Math.random() * 500) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Mock: random result code
    const roll = Math.random();
    if (roll < 0.5) {
      console.log("[App/API] ✅ Verification result: PASSED");
      sessionStorage.setItem("captured_id_card", capturedImage);
      return "PASSED";
    }
    if (roll < 0.65) {
      console.log("[App/API] ⚠️ Verification result: GAUSSIAN_ISSUE");
      return "GAUSSIAN_ISSUE";
    }
    if (roll < 0.8) {
      console.log("[App/API] ⚠️ Verification result: MOTION");
      return "MOTION";
    }
    if (roll < 0.9) {
      console.log("[App/API] ❌ Verification result: RECAPTURE");
      return "RECAPTURE";
    }
    console.log("[App/API] ❌ Verification result: FAILED");
    return "FAILED";
  }

  const onBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }, []);

  const onSuccess = useCallback(() => {
    router.push("/preview");
  }, [router]);

  return (
    <main className="min-h-dvh bg-slate-950 lg:grid lg:place-items-center lg:p-6">
      <IdCardScanner onBack={onBack} onVerify={onVerify} onSuccess={onSuccess} />
    </main>
  );
};

export default Home;
