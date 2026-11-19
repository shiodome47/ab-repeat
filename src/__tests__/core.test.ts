import { describe, expect, it } from 'vitest'
import {
  EMPTY_RANGE,
  adjustA,
  adjustB,
  formatTime,
  isLooping,
  isPlayedThrough,
  setA,
  setRange,
  toggleA,
  toggleB,
} from '../index'

describe('A ボタン（toggleA）', () => {
  it('A が無ければ今の位置に置く', () => {
    expect(toggleA(EMPTY_RANGE, 3)).toEqual({ a: 3, b: null })
  })
  it('A があれば A・B とも外す', () => {
    expect(toggleA({ a: 3, b: 8 }, 5)).toEqual({ a: null, b: null })
  })
  it('setA: B が新しい A 以下なら B を外す・後ろなら残す', () => {
    expect(setA({ a: null, b: 5 }, 6)).toEqual({ a: 6, b: null })
    expect(setA({ a: null, b: 5 }, 2)).toEqual({ a: 2, b: 5 })
  })
})

describe('B ボタン（toggleB）', () => {
  it('A だけなら今の位置に置く', () => {
    expect(toggleB({ a: 3, b: null }, 8, 60)).toEqual({ a: 3, b: 8 })
  })
  it('今の位置が A より前なら、A の 0.1 秒後に置く（動画の終わりは越えない）', () => {
    expect(toggleB({ a: 3, b: null }, 1, 60)).toEqual({ a: 3, b: 3.1 })
    expect(toggleB({ a: 59.95, b: null }, 1, 60)).toEqual({ a: 59.95, b: 60 })
  })
  it('長さが分からない（0）ときも、A の 0.1 秒後に置ける', () => {
    expect(toggleB({ a: 3, b: null }, 1, 0)).toEqual({ a: 3, b: 3.1 })
  })
  it('B があれば B だけ外す', () => {
    expect(toggleB({ a: 3, b: 8 }, 5, 60)).toEqual({ a: 3, b: null })
  })
  it('A も B も無ければ何もしない（同じものを返す）', () => {
    const r = { a: null, b: null }
    expect(toggleB(r, 5, 60)).toBe(r)
  })
})

describe('微調整（adjustA・adjustB）', () => {
  it('A は 0 より前・B の 0.1 秒手前より後ろへは行かない', () => {
    expect(adjustA({ a: 0.2, b: 8 }, -0.5, 60)).toEqual({ a: 0, b: 8 })
    expect(adjustA({ a: 7.8, b: 8 }, 0.5, 60).a).toBeCloseTo(7.9)
  })
  it('B は A の 0.1 秒後より前・動画の終わりより後ろへは行かない', () => {
    expect(adjustB({ a: 3, b: 3.2 }, -0.5, 60).b).toBeCloseTo(3.1)
    expect(adjustB({ a: 3, b: 59.8 }, 0.5, 60)).toEqual({ a: 3, b: 60 })
  })
  it('長さが分からない（0）ときは、終わりで止めない（0 に引き戻さない）', () => {
    expect(adjustA({ a: 5, b: null }, 0.5, 0)).toEqual({ a: 5.5, b: null })
    expect(adjustB({ a: 3, b: 8 }, 0.5, 0)).toEqual({ a: 3, b: 8.5 })
  })
  it('無い方を動かそうとしても何もしない（同じものを返す）', () => {
    const r = { a: null, b: null }
    expect(adjustA(r, 0.5, 60)).toBe(r)
    expect(adjustB(r, 0.5, 60)).toBe(r)
  })
})

describe('そのほか', () => {
  it('setRange: B が A より後ろのときだけ入れる', () => {
    const r = { a: null, b: null }
    expect(setRange(r, 3, 8)).toEqual({ a: 3, b: 8 })
    expect(setRange(r, 8, 3)).toBe(r)
  })
  it('isLooping: A・B の両方があるときだけ', () => {
    expect(isLooping({ a: 3, b: 8 })).toBe(true)
    expect(isLooping({ a: 3, b: null })).toBe(false)
    expect(isLooping({ a: 0, b: 8 })).toBe(true)
  })
  it('isPlayedThrough: ふつうに再生して B に届いたときだけ', () => {
    expect(isPlayedThrough(7.95, 3, 8)).toBe(true)
    expect(isPlayedThrough(3, 3, 8)).toBe(false) // A から一気に B の先へ（シーク）
    expect(isPlayedThrough(20, 3, 8)).toBe(false) // 前の区間（B より後ろ）から切り替えた直後
    expect(isPlayedThrough(1, 3, 8)).toBe(false) // A より前
  })
  it('formatTime: 分:秒', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(83.9)).toBe('1:23')
    expect(formatTime(3725)).toBe('62:05')
  })
})
