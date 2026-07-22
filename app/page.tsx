"use client";

import { IdCardScanner, type IVerifyResult } from "@/components/id-card-scanner";

const Home = () => {
  const onVerify = async (_capturedImage: string): Promise<IVerifyResult> => {
    // Mock verification — instant, no API call
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { success: true };
  };

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <main className="min-h-dvh bg-slate-950 sm:grid sm:place-items-center sm:p-6">
      <IdCardScanner onBack={onBack} onVerify={onVerify} />
    </main>
  );
};

export default Home;
