import { isPlayedThrough } from './core'
import type { ABRange } from './core'

export interface PolledABLoopOptions {
  /** A へ戻す（YouTube なら player.seekTo(a, true)） */
  seek: (a: number) => void
  /** ふつうに再生して B に届き、A に戻したとき（シークで B を越えたときは呼ばない） */
  onLoop?: () => void
  /** A へ戻したのに、まだ B より後ろの位置が返ってくるとき、戻し直すまでの時間（ミリ秒） */
  retryMs?: number
  /** 今の時刻（ミリ秒）。テスト用 */
  now?: () => number
}

export interface PolledABLoop {
  /**
   * 見張りのたびに（例: 0.1 秒ごと）、今の位置 t と A・B を渡す。A に戻したら true
   */
  check: (t: number, range: ABRange) => boolean
  /** 覚えている位置を忘れる（別の動画に切り替えたときなど） */
  reset: () => void
}

/**
 * 位置を自分で読みに行くプレイヤー（YouTube の IFrame API など）の A-B ループ。
 * 使う側の setInterval の中で check() を呼ぶ。
 *
 * YouTube は A へ戻したあとも、しばらく前の位置（B より後ろ）を返すことがある。
 * B より前の位置が返ってくるまでは、くり返しを数えない（戻るのが遅いときは retryMs ごとに戻し直す。数えはしない）。
 */
export function createPolledABLoop({ seek, onLoop, retryMs = 1000, now = Date.now }: PolledABLoopOptions): PolledABLoop {
  /** A へ戻したあと、まだ B より前の位置が返ってきていない（いつ戻したか）。null なら戻し済み */
  let wrappedAt: number | null = null
  /** 直前に見た位置（ふつうに再生して B に届いたかを見分ける。シークで越えたときは数えない） */
  let prev = 0

  return {
    check: (t, { a, b }) => {
      const before = prev
      prev = t
      if (a === null || b === null || t < b) {
        wrappedAt = null
        return false
      }
      const n = now()
      if (wrappedAt === null) {
        seek(a)
        if (isPlayedThrough(before, a, b)) onLoop?.()
        wrappedAt = n
        return true
      }
      if (n - wrappedAt > retryMs) {
        seek(a)
        wrappedAt = n
        return true
      }
      return false
    },
    reset: () => {
      wrappedAt = null
      prev = 0
    },
  }
}
