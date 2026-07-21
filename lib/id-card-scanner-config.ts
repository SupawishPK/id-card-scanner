/**
 * Standard Thai ID Card Physical Aspect Ratio (85.60 mm x 53.98 mm ISO/IEC 7810 ID-1)
 */
export const ID_CARD_ASPECT_RATIO = 85.6 / 53.98;

export const CARD_DETECTION_CONFIG = {
  // Background padding keeps edges measurable when the card matches the guide.
  analysisPaddingRatio: 0.08,
  presenceConfidence: { enter: 0.54, exit: 0.44 },
  captureConfidence: { enter: 0.56, exit: 0.46 },
} as const;

export const EDGE_SCAN_INSET_RATIO = 0.14;
export const CORNER_RADIUS_RATIO = 0.055;
export const EDGE_LUMA_DELTA_THRESHOLD = 16;
export const EDGE_DELTA_THRESHOLD = 24;

export const PRESENCE_RULES = {
  minEdgeScore: 0.42,
  minCornerScore: 0.12,
  minAspectScore: 0.48,
  minSpanCoverage: 0.23,
  maxSpanCoverage: 1.08,
} as const;

export const RELAXED_PRESENCE_RULES = {
  minEdgeScore: 0.4,
  minCornerScore: 0.08,
  minAspectScore: 0.38,
  minSpanCoverage: 0.2,
  maxSpanCoverage: 1.12,
} as const;

export const CAPTURE_RULES = {
  minEdgeScore: 0.38,
  minCornerScore: 0.12,
  minAspectScore: 0.5,
  // Card must cover at least 90% of the guide overlay frame.
  minSpanCoverage: 0.9,
  maxSpanCoverage: 1.04,
  outerTolerance: 0.02,
} as const;

export const RELAXED_CAPTURE_RULES = {
  minEdgeScore: 0.36,
  minCornerScore: 0.1,
  minAspectScore: 0.4,
  minSpanCoverage: 0.88,
  maxSpanCoverage: 1.08,
  outerTolerance: 0.035,
} as const;

export const DEFAULT_DETECTION_THRESHOLDS = {
  sampleIntervalMs: 1000 / 15,
  motionEnterThreshold: 11,
  motionExitThreshold: 15,
  presenceConfidenceEnter: CARD_DETECTION_CONFIG.presenceConfidence.enter,
  presenceConfidenceExit: CARD_DETECTION_CONFIG.presenceConfidence.exit,
  captureConfidenceEnter: CARD_DETECTION_CONFIG.captureConfidence.enter,
  captureConfidenceExit: CARD_DETECTION_CONFIG.captureConfidence.exit,
} as const;

export const SCANNER_TIMING = {
  ANALYSIS_HEIGHT: 240,
  ANALYSIS_WIDTH: Math.round(240 * ID_CARD_ASPECT_RATIO),
  ACQUIRE_MISS_GRACE_FRAMES: 2,
  READY_MISS_GRACE_FRAMES: 5,
} as const;

/**
 * Configuration Options & Tuning Knobs for ID Card Scanner Detection Accuracy
 */
export const DEFAULT_SCANNER_CONFIG = {
  /**
   * จำนวนเฟรมต่อเนื่องกันที่บัตรต้องอยู่นิ่งและวางตรงตำแหน่ง ก่อนจะเปลี่ยนสถานะเป็น "stable" (พร้อมถ่าย)
   */
  stableFrames: 4,

  /**
   * ระยะเวลาขั้นต่ำ (มิลลิวินาที) ที่บัตรต้องอยู่นิ่งติดต่อกันก่อนเปลี่ยนสถานะเป็นพร้อมถ่าย
   */
  minimumStableMs: 180,

  /**
   * คุณภาพของรูปภาพ JPEG ที่สกัดได้จากกล้องเมื่อทำการถ่ายภาพ (ค่าระหว่าง 0.0 ถึง 1.0)
   * 1.0 = 100% (ส่งภาพชัดสูงสุดไปให้ฝั่งประมวลผลก่อน Compress)
   */
  jpegQuality: 1.0,

  /**
   * ความถี่รอบการคำนวณประมวลผลเฟรม (มิลลิวินาที) (~15 FPS)
   */
  sampleIntervalMs: 1000 / 15,

  /**
   * ค่าเกณฑ์ความไหวสูงสุดของภาพเพื่อเริ่มต้นเข้าสู่สถานะนิ่ง
   */
  motionEnterThreshold: DEFAULT_DETECTION_THRESHOLDS.motionEnterThreshold,

  /**
   * ค่าเกณฑ์ความไหวของภาพที่จะหลุดออกจากสถานะนิ่ง
   */
  motionExitThreshold: DEFAULT_DETECTION_THRESHOLDS.motionExitThreshold,

  /**
   * คะแนนความมั่นใจขั้นต่ำในการตรวจพบขอบเขตของบัตรประชาชนในภาพ
   */
  presenceConfidenceEnter: DEFAULT_DETECTION_THRESHOLDS.presenceConfidenceEnter,
  presenceConfidenceExit: DEFAULT_DETECTION_THRESHOLDS.presenceConfidenceExit,

  /**
   * คะแนนความมั่นใจขั้นต่ำในการตรวจดูว่าบัตรจัดวางตรงพอดีกับกรอบ ROI สำหรับถ่ายภาพ
   */
  captureConfidenceEnter: DEFAULT_DETECTION_THRESHOLDS.captureConfidenceEnter,
  captureConfidenceExit: DEFAULT_DETECTION_THRESHOLDS.captureConfidenceExit,

  /**
   * จำนวนเฟรมที่ผ่อนปรนให้ภาพสั่นหรือหลุดโฟกัสได้ชั่วคราวขณะเข้าใกล้สถานะพร้อมถ่าย
   */
  acquireMissGraceFrames: SCANNER_TIMING.ACQUIRE_MISS_GRACE_FRAMES,

  /**
   * จำนวนเฟรมที่ผ่อนปรนให้ภาพสั่นหลุดโฟกัสได้ชั่วคราวเมื่ออยู่ในสถานะพร้อมถ่ายแล้ว
   */
  readyMissGraceFrames: SCANNER_TIMING.READY_MISS_GRACE_FRAMES,
} as const;

export type ScannerConfig = Partial<typeof DEFAULT_SCANNER_CONFIG>;
