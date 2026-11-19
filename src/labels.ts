/** A-B リピートの操作の列の文言。変えたいものだけ labels で渡す */
export interface ABRepeatLabels {
  /** A ボタン（A が無いとき）のヒント */
  setA: string
  /** A ボタン（A があるとき）のヒント */
  clearA: string
  /** B ボタン（A だけあるとき）のヒント */
  setB: string
  /** B ボタン（B があるとき）のヒント */
  clearB: string
  /** B ボタン（A も B も無いとき・押せない）のヒント */
  needA: string
  /** A−・B− のヒント */
  earlier: (point: 'A' | 'B', step: number) => string
  /** A＋・B＋ のヒント */
  later: (point: 'A' | 'B', step: number) => string
  /** ×（A・B とも外す）のヒント・読み上げ */
  clear: string
  /** A・B が無いときに右に出す説明 */
  hint: string
}

/** 既定（日本語） */
export const JA_LABELS: ABRepeatLabels = {
  setA: 'A地点を設定',
  clearA: 'A地点を解除',
  setB: 'B地点を設定',
  clearB: 'B地点を解除',
  needA: 'A地点を先に設定してください',
  earlier: (point, step) => `${point} を ${step}秒前に`,
  later: (point, step) => `${point} を ${step}秒後に`,
  clear: 'A-Bリピートを解除',
  hint: 'A → B でリピート区間を設定',
}

/** 英語 */
export const EN_LABELS: ABRepeatLabels = {
  setA: 'Set point A',
  clearA: 'Clear point A',
  setB: 'Set point B',
  clearB: 'Clear point B',
  needA: 'Set point A first',
  earlier: (point, step) => `Move ${point} ${step}s earlier`,
  later: (point, step) => `Move ${point} ${step}s later`,
  clear: 'Clear A-B repeat',
  hint: 'Set A → B to repeat a section',
}
