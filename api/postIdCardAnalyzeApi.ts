// Type-only mirror of acw-mf-web's analyze API result codes — the poc keeps the
// scanner's contract identical without pulling in the API infra (valibot/neverthrow).

export type IIdCardAnalyzeCode =
  | 'PASSED'
  | 'FAILED'
  | 'GAUSSIAN_ISSUE'
  | 'MOTION'
  | 'DARK'
  | 'TAMPERING'
  | 'RECAPTURE'
  | 'NOT_POINTING'
  | 'LOW_QUALITY'
  | 'TOO_FAR'
  | 'NOT_STRAIGHT'

export type IIdCardAnalyzeWarningCode = Exclude<IIdCardAnalyzeCode, 'PASSED' | 'FAILED' | 'RECAPTURE'>
export type IIdCardAnalyzeErrorCode = Extract<IIdCardAnalyzeCode, 'FAILED' | 'RECAPTURE'>
