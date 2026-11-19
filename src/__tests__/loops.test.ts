import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attachVideoABLoop, createPolledABLoop } from '../index'
import type { ABRange, LoopableVideo } from '../index'

/** <video> の代わり（位置・止まっているか・イベント） */
class FakeVideo extends EventTarget {
  currentTime = 0
  paused = true
  emit(type: string) {
    this.dispatchEvent(new Event(type))
  }
}

describe('<video> の A-B ループ（attachVideoABLoop）', () => {
  let rafCallbacks: FrameRequestCallback[] = []
  beforeEach(() => {
    rafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafCallbacks.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCallbacks = []
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  function setup(range: ABRange) {
    const video = new FakeVideo()
    const onLoop = vi.fn()
    let r = range
    const loop = attachVideoABLoop(video as unknown as LoopableVideo, { getRange: () => r, onLoop })
    return { video, onLoop, loop, setRange: (next: ABRange) => (r = next) }
  }

  it('ふつうに再生して B に届いたら A に戻し、1 回と数える', () => {
    const { video, onLoop } = setup({ a: 3, b: 8 })
    video.currentTime = 7.9
    video.emit('timeupdate')
    video.currentTime = 8.05
    video.emit('timeupdate')
    expect(video.currentTime).toBe(3)
    expect(onLoop).toHaveBeenCalledTimes(1)
  })

  it('シークで B を越えたときは A に戻すが、数えない', () => {
    const { video, onLoop } = setup({ a: 3, b: 8 })
    video.currentTime = 4
    video.emit('timeupdate')
    video.currentTime = 20
    video.emit('seeking')
    video.emit('timeupdate')
    expect(video.currentTime).toBe(3)
    expect(onLoop).not.toHaveBeenCalled()
  })

  it('再生中は、画面の描き直しのたびにも確かめる（timeupdate を待たない）', () => {
    const { video, onLoop } = setup({ a: 3, b: 8 })
    video.paused = false
    video.currentTime = 7.95
    video.emit('playing')
    rafCallbacks.shift()?.(0)
    video.currentTime = 8.01
    rafCallbacks.shift()?.(0)
    expect(video.currentTime).toBe(3)
    expect(onLoop).toHaveBeenCalledTimes(1)
  })

  it('A・B が無いときは何もしない。refresh で入れたあとの見張りを始める', () => {
    const { video, loop, setRange } = setup({ a: null, b: null })
    video.paused = false
    video.currentTime = 10
    video.emit('playing')
    expect(rafCallbacks).toHaveLength(0)
    setRange({ a: 3, b: 8 })
    loop.refresh()
    expect(rafCallbacks).toHaveLength(1)
  })

  it('detach したら、もう戻さない', () => {
    const { video, loop } = setup({ a: 3, b: 8 })
    loop.detach()
    video.currentTime = 9
    video.emit('timeupdate')
    expect(video.currentTime).toBe(9)
  })
})

describe('位置を読みに行くプレイヤーの A-B ループ（createPolledABLoop・YouTube など）', () => {
  it('B を過ぎたら A に戻し、同じ古い位置を何度読んでも 1 回と数える（戻るのが遅くても）', () => {
    let now = 0
    const seek = vi.fn()
    const onLoop = vi.fn()
    const loop = createPolledABLoop({ seek, onLoop, now: () => now })
    const range = { a: 3, b: 8 }

    expect(loop.check(7.95, range)).toBe(false)
    now = 100
    expect(loop.check(8.05, range)).toBe(true)
    expect(seek).toHaveBeenLastCalledWith(3)
    expect(onLoop).toHaveBeenCalledTimes(1)

    // YouTube がまだ前の位置を返す（戻し直さない・数えない）
    now = 200
    expect(loop.check(8.05, range)).toBe(false)
    // 1 秒たっても戻らないので、戻し直す（数えない）
    now = 1200
    expect(loop.check(8.05, range)).toBe(true)
    expect(seek).toHaveBeenCalledTimes(2)
    expect(onLoop).toHaveBeenCalledTimes(1)

    // A に戻ったあと、また B に届いたら 1 回
    now = 1300
    loop.check(3.1, range)
    loop.check(7.98, range)
    loop.check(8.02, range)
    expect(onLoop).toHaveBeenCalledTimes(2)
  })

  it('A・B が無いときは何もしない', () => {
    const seek = vi.fn()
    const loop = createPolledABLoop({ seek })
    expect(loop.check(100, { a: null, b: null })).toBe(false)
    expect(loop.check(100, { a: 3, b: null })).toBe(false)
    expect(seek).not.toHaveBeenCalled()
  })

  it('シークで B を越えたときは戻すが、数えない', () => {
    const seek = vi.fn()
    const onLoop = vi.fn()
    const loop = createPolledABLoop({ seek, onLoop })
    loop.check(4, { a: 3, b: 8 })
    loop.check(30, { a: 3, b: 8 })
    expect(seek).toHaveBeenCalledWith(3)
    expect(onLoop).not.toHaveBeenCalled()
  })
})
