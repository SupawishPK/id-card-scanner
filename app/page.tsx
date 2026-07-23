"use client";

import { useCallback } from "react";
import { IdCardScanner, type IVerifyResult } from "@/components/id-card-scanner";

const Home = () => {
  const onVerify = useCallback(async (capturedImage: string): Promise<IVerifyResult> => {
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
        error: {
          title: "ภาพไม่ชัดเจน",
          description: "ระบบไม่สามารถอ่านข้อมูลบนบัตรได้ครบถ้วน กรุณาถ่ายใหม่",
        },
      };
    }

    // Success: store image
    console.log("[App/API] ✅ Verification result: SUCCESS!");
    sessionStorage.setItem("captured_id_card", capturedImage);
    return { success: true };
  }, []);

  const onBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  }, []);

  return (
    <main className="min-h-dvh bg-slate-950 sm:grid sm:place-items-center sm:p-6">
      <IdCardScanner onBack={onBack} onVerify={onVerify} />
    </main>
  );
};

export default Home;
