"use client";

import { useRouter } from "next/navigation";
import { IdCardScanner, type IVerifyResult } from "@/components/id-card-scanner";

const Home = () => {
  const router = useRouter();

  const onVerify = async (capturedImage: string): Promise<IVerifyResult> => {
    // Mock: simulate short verification delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Random error cases (~30% chance)
    const roll = Math.random();
    if (roll < 0.15) {
      return {
        success: false,
        error: {
          title: "ภาพไม่ชัดเจน",
          description: "ระบบไม่สามารถอ่านข้อมูลบนบัตรได้ครบถ้วน กรุณาถ่ายใหม่",
          hint: "วางบัตรในที่มีแสงสว่างเพียงพอ หลีกเลี่ยงเงาหรือแสงสะท้อน",
        },
      };
    }
    if (roll < 0.30) {
      return {
        success: false,
        error: {
          title: "ตรวจไม่พบบัตรประชาชน",
          description: "กรุณาใช้บัตรประชาชนไทยเท่านั้น",
          hint: "ตรวจสอบว่าบัตรอยู่ในกรอบและไม่มีสิ่งบดบัง",
        },
      };
    }

    // Success: store image and navigate to preview
    sessionStorage.setItem("captured_id_card", capturedImage);
    router.push("/preview");
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
