"use client";

import { IdCardScanner, type IVerifyResult } from "@/components/id-card-scanner";

const Home = () => {
  const onVerify = async (capturedImage: string): Promise<IVerifyResult> => {
    try {
      // 1. ยิง API เพื่อตรวจจับ/ตรวจสอบบัตรประชาชน
      const res = await fetch("/api/detect-idcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data = await res.json().catch(() => ({}));

      // 2. ถ้า API ส่งสถาะไม่ผ่าน หรือ response ไม่สำเร็จ ให้ส่ง error กลับไปควบคุม Error Modal
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: {
            title: data.error?.title || "ตรวจสอบข้อมูลบัตรไม่สำเร็จ",
            description:
              data.error?.description ||
              "ระบบไม่สามารถอ่านข้อมูลบนบัตรได้ครบถ้วน กรุณาถ่ายใหม่อีกครั้ง",
            hint:
              data.error?.hint ||
              "กรุณาจัดวางบัตรในที่ที่มีแสงสว่างเพียงพอ และหลีกเลี่ยงเงาหรือแสงสะท้อน",
          },
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: {
          title: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
          description: "ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ได้",
          hint: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
        },
      };
    }
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
