/**
 * A-B リピートの計算（画面・プレイヤーに頼らない）。
 *
 * A・B は使う側（アプリの store など）で持つ。ここの関数は、今の A・B と操作から、次の A・B を返すだけ。
 * 変わらないときは、渡したものをそのまま返す（使う側で「変わったか」を === で見分けられる）。
 */

/** A 地点・B 地点（秒）。決めていない方は null */
export interface ABRange {
  a: number | null
  b: number | null
}

/** A・B とも決めていない */
export const EMPTY_RANGE: ABRange = Object.freeze({ a: null, b: null }) as ABRange

/** A と B のあいだに必ず空ける幅（秒）。A と B が同じ位置にならないように */
export const MIN_GAP = 0.1

/** 微調整のボタン（A−・A＋・B−・B＋）で動かす幅（秒） */
export const AB_STEP = 0.5

/** A・B の両方が決まっている（くり返す状態）か */
export function isLooping(range: ABRange): range is { a: number; b: number } {
  return range.a !== null && range.b !== null
}

/**
 * A・B をまとめて決める（保存した区間を開いたときなど）。
 * B が A より後ろでなければ、何もしない（渡した range を返す）
 */
export function setRange(range: ABRange, a: number, b: number): ABRange {
  return b > a ? { a, b } : range
}

/** A を t に置く。B が新しい A 以下になるなら、B は外す */
export function setA(range: ABRange, t: number): ABRange {
  return { a: t, b: range.b !== null && range.b <= t ? null : range.b }
}

/** A ボタン: A が無ければ t に置く。あれば A・B とも外す */
export function toggleA(range: ABRange, t: number): ABRange {
  return range.a !== null ? { a: null, b: null } : setA(range, t)
}

/**
 * B ボタン: B があれば B だけ外す。A だけなら t に置く
 * （t が A より前なら A の MIN_GAP 秒後。duration は動画の長さ。分からなければ 0）。
 * A も B も無いときは何もしない
 */
export function toggleB(range: ABRange, t: number, duration: number): ABRange {
  if (range.b !== null) return { a: range.a, b: null }
  if (range.a === null) return range
  const b = t > range.a ? t : Math.min(range.a + MIN_GAP, duration || Number.POSITIVE_INFINITY)
  return { a: range.a, b }
}

/** A を delta 秒動かす（0 より前・B の MIN_GAP 秒手前より後ろへは行かない）。A が無ければ何もしない */
export function adjustA(range: ABRange, delta: number, duration: number): ABRange {
  if (range.a === null) return range
  const upper = range.b !== null ? range.b - MIN_GAP : duration || Number.POSITIVE_INFINITY
  return { a: Math.max(0, Math.min(range.a + delta, upper)), b: range.b }
}

/** B を delta 秒動かす（A の MIN_GAP 秒後より前・動画の終わりより後ろへは行かない）。B が無ければ何もしない */
export function adjustB(range: ABRange, delta: number, duration: number): ABRange {
  if (range.b === null) return range
  const lower = range.a !== null ? range.a + MIN_GAP : 0
  return { a: range.a, b: Math.max(lower, Math.min(range.b + delta, duration || Number.POSITIVE_INFINITY)) }
}

/** 数える「1 回」とみなす、B の手前の幅（秒）。画面の描き直し・timeupdate の間隔と、速い再生（2 倍）でも届く幅 */
export const PLAYED_THROUGH_WINDOW = 1.5

/**
 * ふつうに再生して B に届いたか（直前の位置が A〜B のあいだで、B の近く）。
 * シークで B を越えたとき・別の区間に切り替えた直後は false（くり返しと数えない）。
 */
export function isPlayedThrough(before: number, a: number, b: number): boolean {
  return before >= a - 0.05 && before < b && b - before <= PLAYED_THROUGH_WINDOW
}

/** 秒を「分:秒」にする（例: 83.4 → "1:23"） */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
