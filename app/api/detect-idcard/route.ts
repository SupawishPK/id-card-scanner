import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          error: {
            title: "ไม่พบข้อมูลรูปภาพ",
            description: "ไม่พบไฟล์หรือข้อมูลรูปภาพบัตรประชาชนที่ส่งมา",
            hint: "กรุณาลองถ่ายรูปภาพใหม่อีกครั้ง",
          },
        },
        { status: 400 },
      );
    }

    // Mock ID card detection / verification API processing
    // In production, this can call AI/OCR or vision recognition service
    const isSuccess = Math.random() > 0.7;

    if (!isSuccess) {
      return NextResponse.json({
        success: false,
        error: {
          title: "ภาพถ่ายบัตรไม่ชัดเจน",
          description: "ระบบตรวจพบเงา แสงสะท้อน หรือข้อมูลบนหน้าบัตรไม่สมบูรณ์",
          hint: "ขยับเข้าใกล้ ถ่ายในพื้นที่สว่าง และหลีกเลี่ยงแสงสะท้อนบนบัตร",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "ตรวจสอบบัตรประชาชนสำเร็จ",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          title: "ระบบขัดข้อง",
          description: "เกิดข้อผิดพลาดไม่คาดคิดขณะเชื่อมต่อเซิร์ฟเวอร์",
          hint: "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง",
        },
      },
      { status: 500 },
    );
  }
};
