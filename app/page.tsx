"use client";

import { useCallback } from "react";
import IdCardScanner, { IVerifyResult } from "@/components/IdCardScanner";

const Home = () => {
  const onVerify = async (capturedImage: string): Promise<IVerifyResult> => {
    console.log("[App/API] 🛰️ Verifying ID Card photo in background...");
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
