"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import IdCardScanner, { IVerifyResult } from "@/components/IdCardScanner";

const Home = () => {
  const router = useRouter();

  const onVerify = async (capturedImage: string): Promise<IVerifyResult> => {
    console.log("[App/API] 🛰️ Verifying ID Card photo in background...");

    // Mock: simulate API response delay between 1000 - 1500 ms
    const delay = Math.floor(Math.random() * 500) + 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Mock: random result — success / warning / failed
    const roll = Math.random();
    if (roll < 0.5) {
      console.log("[App/API] ✅ Verification result: SUCCESS!");
      sessionStorage.setItem("captured_id_card", capturedImage);
      return { success: true };
    }
    if (roll < 0.8) {
      console.log("[App/API] ⚠️ Verification result: WARNING");
      return {
        success: false,
        message: "มีแสงหรือเงาสะท้อนบนบัตร ลองสแกนอีกครั้ง",
        type: 'warning',
      };
    }
    console.log("[App/API] ❌ Verification result: FAILED");
    return {
      success: false,
      message: "ตรวจสอบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      type: 'failed',
    };
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
