// A-B リピート（区間を決めて、くり返し再生する）の部品。
// 見た目は '@shiodome47/ab-repeat/style.css' を 1 回だけ読み込む。

export {
  AB_STEP,
  EMPTY_RANGE,
  MIN_GAP,
  PLAYED_THROUGH_WINDOW,
  adjustA,
  adjustB,
  formatTime,
  isLooping,
  isPlayedThrough,
  setA,
  setRange,
  toggleA,
  toggleB,
} from './core'
export type { ABRange } from './core'

export { attachVideoABLoop, useVideoABLoop } from './videoLoop'
export type { LoopableVideo, VideoABLoop, VideoABLoopOptions } from './videoLoop'

export { createPolledABLoop } from './polledLoop'
export type { PolledABLoop, PolledABLoopOptions } from './polledLoop'

export { ABRepeatControls } from './ABRepeatControls'
export type { ABRepeatControlsProps, ABRepeatTheme } from './ABRepeatControls'

export { EN_LABELS, JA_LABELS } from './labels'
export type { ABRepeatLabels } from './labels'
