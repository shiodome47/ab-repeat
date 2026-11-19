import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { isLooping, isPlayedThrough } from './core'
import type { ABRange } from './core'

/** A-B ループに要る、動画（<video>）の部分。テストでは、これだけを持つものを渡せる */
export type LoopableVideo = Pick<HTMLVideoElement, 'currentTime' | 'paused' | 'addEventListener' | 'removeEventListener'>

export interface VideoABLoopOptions {
  /** 今の A・B（いつも最新を返す） */
  getRange: () => ABRange
  /** ふつうに再生して B に届き、A に戻したとき（シークで B を越えたときは呼ばない）。くり返しの回数を数えるのに使う */
  onLoop?: () => void
}

export interface VideoABLoop {
  /** A・B を入れた・外したときに呼ぶ（再生中なら、細かい見張りを始める・止める） */
  refresh: () => void
  /** 見張りをやめる */
  detach: () => void
}

/**
 * <video> の A-B ループ。B まで来たら A に戻す。
 *
 * video の timeupdate は 1 秒に 4 回ほどしか来ないので、それだけだと B を 0.2 秒ほど過ぎてしまう
 * （次の場面が少し見える）。A・B があって再生しているあいだは、画面を描き直すたび（約 60 回/秒）にも確かめる。
 * 裏に回ったとき（描き直しが止まる）は timeupdate で確かめる。
 */
export function attachVideoABLoop(video: LoopableVideo, { getRange, onLoop }: VideoABLoopOptions): VideoABLoop {
  /** 直前に見た位置（ふつうに再生して B に届いたかを見分ける） */
  let prev = video.currentTime
  /** シークした（→ キー・シークバーなど）。シークで B を越えたときは、くり返しと数えない */
  let seeked = false

  const check = () => {
    const range = getRange()
    const t = video.currentTime
    const before = prev
    prev = t
    if (!isLooping(range)) return
    if (t >= range.b) {
      video.currentTime = range.a
      prev = range.a
      if (isPlayedThrough(before, range.a, range.b) && !seeked) onLoop?.()
      seeked = false
    }
  }
  const onSeeking = () => {
    // こちらが A へ戻したシークは数えない（戻した直後の位置は A のあたり）
    const { a } = getRange()
    if (a !== null && Math.abs(video.currentTime - a) < 0.05) return
    seeked = true
  }
  const onSeeked = () => {
    prev = video.currentTime
  }

  let raf = 0
  const loop = () => {
    check()
    raf = requestAnimationFrame(loop)
  }
  const stop = () => cancelAnimationFrame(raf)
  const start = () => {
    stop()
    if (isLooping(getRange()) && !video.paused) raf = requestAnimationFrame(loop)
  }

  video.addEventListener('timeupdate', check)
  video.addEventListener('seeking', onSeeking)
  video.addEventListener('seeked', onSeeked)
  video.addEventListener('playing', start)
  video.addEventListener('pause', stop)
  video.addEventListener('ended', stop)
  start()

  return {
    refresh: start,
    detach: () => {
      stop()
      video.removeEventListener('timeupdate', check)
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('playing', start)
      video.removeEventListener('pause', stop)
      video.removeEventListener('ended', stop)
    },
  }
}

/**
 * React で <video> の A-B ループを使う。
 * range（A・B）が変わるたびに見張りを合わせる。videoRef の動画は、最初に描いたときにあること
 */
export function useVideoABLoop(
  videoRef: RefObject<LoopableVideo | null>,
  range: ABRange,
  options: { onLoop?: () => void } = {},
): void {
  const rangeRef = useRef(range)
  rangeRef.current = range
  const onLoopRef = useRef(options.onLoop)
  onLoopRef.current = options.onLoop
  const loopRef = useRef<VideoABLoop | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const loop = attachVideoABLoop(v, {
      getRange: () => rangeRef.current,
      onLoop: () => onLoopRef.current?.(),
    })
    loopRef.current = loop
    return () => {
      loop.detach()
      loopRef.current = null
    }
    // videoRef は ref オブジェクトで変わらないので、最初に 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loopRef.current?.refresh()
  }, [range.a, range.b])
}
