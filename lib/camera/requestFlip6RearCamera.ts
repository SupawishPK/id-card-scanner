/**
 * เลือกกล้องหลังตัวแรก (camera 0) บน Flip6 แบบ self-contained (ไม่แยกฟังก์ชัน)
 * คืน constraints สำหรับ getUserMedia ที่ล็อก deviceId กล้องหลังตัวแรก
 */

const requestFlip6RearCameraConstraints = async (
  onLog: (message: string, detail?: unknown) => void = (...args) => console.log(...args),
): Promise<MediaStreamConstraints | null> => {
  onLog('ขอ permission กล้อง (เปิด throwaway stream)…');
  let warmup: MediaStream;
  try {
    warmup = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
  } catch (err) {
    onLog('permission denied / error', err);
    return null;
  }
  onLog('permission granted, ได้สตรีม', warmup);
  warmup.getTracks().forEach((track) => {
    onLog(`ปิด track: ${track.kind}`);
    track.stop();
  });
  onLog('ปิด throwaway stream เรียบร้อย');

  const devices = await navigator.mediaDevices.enumerateDevices();
  onLog('enumerateDevices result', devices);

  const rearCameras: { deviceId: string; label: string }[] = [];

  for (const device of devices) {
    if (device.kind !== 'videoinput' || !device.deviceId) continue;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { deviceId: { exact: device.deviceId } },
      });
    } catch {
      onLog('เปิดกล้องไม่สำเร็จ, ข้าม', device);
      continue;
    }

    try {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      const facing = capabilities.facingMode ?? [];

      if (facing.includes('user')) continue;
      if (facing.length === 0 && /front/i.test(device.label)) continue;

      rearCameras.push({ deviceId: device.deviceId, label: device.label });
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  onLog('rearCameras', rearCameras);
  const flip6Camera = rearCameras[0];
  onLog('flip6Camera', flip6Camera);
  if (!flip6Camera?.deviceId) return null;

  return {
    audio: false,
    video: {
      deviceId: { exact: flip6Camera.deviceId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
};

export default requestFlip6RearCameraConstraints;
