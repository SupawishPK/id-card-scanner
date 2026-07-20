export type ReadinessConfig = {
  stableFrames: number;
  minimumStableMs: number;
  acquireMissGraceFrames: number;
  readyMissGraceFrames: number;
};

export type ReadinessState = {
  stableSince: number | null;
  stableFrames: number;
  acquireMisses: number;
  readyMisses: number;
  isReady: boolean;
};

export function createReadinessState(): ReadinessState {
  return {
    stableSince: null,
    stableFrames: 0,
    acquireMisses: 0,
    readyMisses: 0,
    isReady: false,
  };
}

export function resetReadiness(state: ReadinessState) {
  state.stableSince = null;
  state.stableFrames = 0;
  state.acquireMisses = 0;
  state.readyMisses = 0;
  state.isReady = false;
}

/** Mutates one reusable state object to avoid allocations in the 15 FPS loop. */
export function updateReadiness(
  state: ReadinessState,
  isCandidate: boolean,
  now: number,
  config: ReadinessConfig,
) {
  if (isCandidate) {
    state.acquireMisses = 0;
    state.readyMisses = 0;

    if (!state.isReady) {
      state.stableFrames += 1;
      state.stableSince ??= now;
      state.isReady =
        state.stableFrames >= config.stableFrames &&
        now - state.stableSince >= config.minimumStableMs;
    }
    return state.isReady;
  }

  if (
    !state.isReady &&
    state.stableFrames > 0 &&
    state.acquireMisses < config.acquireMissGraceFrames
  ) {
    state.acquireMisses += 1;
    return false;
  }

  if (state.isReady && state.readyMisses < config.readyMissGraceFrames) {
    state.readyMisses += 1;
    return true;
  }

  resetReadiness(state);
  return false;
}
