"use client";

import { useCallback } from "react";
import IdCardScanner, { IVerifyResult } from "@/components/IdCardScanner";

const Home = () => {
  const onVerify = async (capturedImage: string): Promise<IVerifyResult> => {
    console.log("[App/API] 🛰️ Verifying ID Card photo in background...");

    // Mock: simulate API response delay between 1000 - 1500 ms
    const delay = Math.floor(Math.random() * 500) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Mock: 50/50 pass/fail rate
    const roll = Math.random();
    if (roll < 0.50) {
      console.log("[App/API] ❌ Verification result: FAIL (50/50 mock rate)");
      return {
        success: false,
        message: "ภาพไม่ชัดเจน",
        type: 'warning',
      };
    }

    // Success: store image
    console.log("[App/API] ✅ Verification result: SUCCESS!");
    sessionStorage.setItem("captured_id_card", capturedImage);
    return { success: true };
  }

  const onBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }, []);

  return (
    <main className="min-h-dvh bg-slate-950 lg:grid lg:place-items-center lg:p-6">
      <IdCardScanner onBack={onBack} onVerify={onVerify} onSuccess={function (): void {
        throw new Error("Function not implemented.");
      }} />
    </main>
  );
};

export default Home;
