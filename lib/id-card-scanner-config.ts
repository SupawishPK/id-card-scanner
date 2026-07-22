/**
 * ID Card Scanner Configuration
 *
 * Adjust values below to tune scanner behaviour.
 * Internal detection parameters live at the bottom — edit only if you know what you're doing.
 */

// ═══════════════════════════════════════════════════════════════════════
// Card Physical Properties
// ═══════════════════════════════════════════════════════════════════════

/** Thai ID Card — ISO/IEC 7810 ID-1 (85.60 × 53.98 mm) */
export const ID_CARD_ASPECT_RATIO = 85.6 / 53.98;

// ═══════════════════════════════════════════════════════════════════════
// User-Tunable Scanner Settings
// ═══════════════════════════════════════════════════════════════════════

export const SCANNER_CONFIG = {
  /** จำนวนเฟรมที่บัตรต้องอยู่นิ่งติดต่อกัน ก่อนเปลี่ยนเป็นสถานะ "พร้อมถ่าย" */
  stableFrames: 4,

  /** ระยะเวลาขั้นต่ำ (ms) ที่บัตรต้องอยู่นิ่งก่อนพร้อมถ่าย */
  minimumStableMs: 180,

  /** ขยายขอบรอบรูปตอน capture กี่ % (0.05 = 5%) */
  capturePaddingRatio: 0.05,

  /** ความถี่ sampling (ms) — ค่าเริ่มต้น ~15 FPS */
  sampleIntervalMs: 1000 / 15,

  /** จุดตัดความเคลื่อนไหว — ต่ำกว่านี้ = ถือนิ่ง (เข้า stable) */
  motionEnterThreshold: 11,

  /** จุดตัดความเคลื่อนไหว — สูงกว่านี้ = หลุด stable */
  motionExitThreshold: 15,

  /** ความมั่นใจขั้นต่ำในการตรวจจับว่ามีบัตร (0–1) */
  presenceConfidenceEnter: 0.54,
  presenceConfidenceExit: 0.44,

  /** ความมั่นใจขั้นต่ำในการยืนยันว่าบัตรวางตรงกรอบ (0–1) */
  captureConfidenceEnter: 0.56,
  captureConfidenceExit: 0.46,

  /** จำนวนเฟรมที่อนุโลมให้ภาพสั่นชั่วคราวระหว่างเข้าใกล้ stable */
  acquireMissGraceFrames: 2,

  /** จำนวนเฟรมที่อนุโลมให้ภาพสั่นชั่วคราวเมื่ออยู่ใน stable แล้ว */
  readyMissGraceFrames: 5,
} as const;

export type ScannerConfig = Partial<typeof SCANNER_CONFIG>;

// ═══════════════════════════════════════════════════════════════════════
// Internal Detection Parameters (advanced — tune with care)
// ═══════════════════════════════════════════════════════════════════════

export const ANALYSIS = {
  height: 240,
  width: Math.round(240 * ID_CARD_ASPECT_RATIO),
  /** Padding รอบกรอบ guide สำหรับวัดพื้นหลังตอนวิเคราะห์ */
  paddingRatio: 0.08,
} as const;

export const EDGE_DETECTION = {
  /** ค่า luma delta ขั้นต่ำถึงนับเป็น edge */
  lumaThreshold: 10,
  /** Luma delta สำหรับ frame-level edge density */
  densityThreshold: 18,
  scanInsetRatio: 0.14,
  cornerRadiusRatio: 0.055,
  /** ความชันสูงสุดของขอบ (radians) ก่อนถือว่าเอียง (~1.15°) */
  maxSlope: 0.02,
  /** ความต่างความชันสูงสุดระหว่างขอบตรงข้าม ก่อนถือว่าเบี้ยว */
  maxParallelismError: 0.035,
} as const;

export const PRESENCE_RULES = {
  minEdgeScore: 0.10,
  minCornerScore: 0.12,
  minAspectScore: 0.00,
  minSpanCoverage: 0.20,
  maxSpanCoverage: 1.12,
  minSkewScore: 0.30,
} as const;

export const RELAXED_PRESENCE_RULES = {
  minEdgeScore: 0.08,
  minCornerScore: 0.08,
  minAspectScore: 0.00,
  minSpanCoverage: 0.18,
  maxSpanCoverage: 1.15,
  minSkewScore: 0.25,
} as const;

export const CAPTURE_RULES = {
  minEdgeScore: 0.38,
  minCornerScore: 0.12,
  minAspectScore: 0.50,
  minSpanCoverage: 0.80,
  maxSpanCoverage: 1.06,
  outerTolerance: 0.02,
  minSkewScore: 0.88,
} as const;

export const RELAXED_CAPTURE_RULES = {
  minEdgeScore: 0.36,
  minCornerScore: 0.10,
  minAspectScore: 0.40,
  minSpanCoverage: 0.78,
  maxSpanCoverage: 1.10,
  outerTolerance: 0.035,
  minSkewScore: 0.80,
} as const;

// Re-export for backward compatibility
export const CARD_DETECTION_CONFIG = {
  analysisPaddingRatio: ANALYSIS.paddingRatio,
  capturePaddingRatio: SCANNER_CONFIG.capturePaddingRatio,
  presenceConfidence: { enter: SCANNER_CONFIG.presenceConfidenceEnter, exit: SCANNER_CONFIG.presenceConfidenceExit },
  captureConfidence: { enter: SCANNER_CONFIG.captureConfidenceEnter, exit: SCANNER_CONFIG.captureConfidenceExit },
} as const;

export const SCANNER_TIMING = {
  ANALYSIS_HEIGHT: ANALYSIS.height,
  ANALYSIS_WIDTH: ANALYSIS.width,
  ACQUIRE_MISS_GRACE_FRAMES: SCANNER_CONFIG.acquireMissGraceFrames,
  READY_MISS_GRACE_FRAMES: SCANNER_CONFIG.readyMissGraceFrames,
} as const;

export const EDGE_SCAN_INSET_RATIO: number = EDGE_DETECTION.scanInsetRatio;
export const CORNER_RADIUS_RATIO: number = EDGE_DETECTION.cornerRadiusRatio;
export const EDGE_LUMA_DELTA_THRESHOLD: number = EDGE_DETECTION.lumaThreshold;
export const EDGE_DELTA_THRESHOLD: number = EDGE_DETECTION.densityThreshold;
export const MAX_EDGE_SLOPE: number = EDGE_DETECTION.maxSlope;
export const MAX_PARALLELISM_ERROR: number = EDGE_DETECTION.maxParallelismError;

export const DEFAULT_SCANNER_CONFIG = SCANNER_CONFIG;
export const DEFAULT_DETECTION_THRESHOLDS = {
  sampleIntervalMs: SCANNER_CONFIG.sampleIntervalMs,
  motionEnterThreshold: SCANNER_CONFIG.motionEnterThreshold,
  motionExitThreshold: SCANNER_CONFIG.motionExitThreshold,
  presenceConfidenceEnter: SCANNER_CONFIG.presenceConfidenceEnter,
  presenceConfidenceExit: SCANNER_CONFIG.presenceConfidenceExit,
  captureConfidenceEnter: SCANNER_CONFIG.captureConfidenceEnter,
  captureConfidenceExit: SCANNER_CONFIG.captureConfidenceExit,
} as const;
