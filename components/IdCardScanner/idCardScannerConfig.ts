const ID_CARD_SCANNER_CONFIG = {
  capturePaddingRatio: 5 / 100,
  retryCooldownMs: 1500,
  successFeedbackDurationMs: 150,
  maxRetryCount: 3,
  verifyTimeoutMs: 30_000,
} as const

export default ID_CARD_SCANNER_CONFIG
