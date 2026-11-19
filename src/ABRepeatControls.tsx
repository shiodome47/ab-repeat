import type { ReactNode } from 'react'
import { AB_STEP, formatTime } from './core'
import { JA_LABELS } from './labels'
import type { ABRepeatLabels } from './labels'

export type ABRepeatTheme = 'light' | 'dark' | 'system'

export interface ABRepeatControlsProps {
  /** A 地点（秒）。無ければ null */
  a: number | null
  /** B 地点（秒）。無ければ null */
  b: number | null
  /** A ボタン（ふつうは toggleA: 無ければ置く・あれば A・B とも外す） */
  onToggleA: () => void
  /** B ボタン（ふつうは toggleB: 無ければ置く・あれば B だけ外す） */
  onToggleB: () => void
  /** A を delta 秒動かす（A−・A＋） */
  onAdjustA: (delta: number) => void
  /** B を delta 秒動かす（B−・B＋） */
  onAdjustB: (delta: number) => void
  /** ×: A・B とも外す */
  onClear: () => void
  /** 'overlay': 動画の上・黒い帯の上に置くとき（白い文字。theme にかかわらず） */
  variant?: 'normal' | 'overlay'
  /** 明るい・暗い（'system' は端末の設定に合わせる）。variant="overlay" のときは使わない */
  theme?: ABRepeatTheme
  /** 微調整のボタンで動かす幅（秒） */
  step?: number
  /** A・B の操作の後ろ（× の前）に置くもの（例: 「区間を保存」のボタン） */
  extra?: ReactNode
  /** 文言。変えたいものだけ（既定は日本語。英語は EN_LABELS） */
  labels?: Partial<ABRepeatLabels>
  className?: string
}

function ClearIcon() {
  return (
    <svg
      className="ab-repeat__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

/**
 * A-B リピートの操作の列。
 *
 * - A・B が無いとき: [A] [B] と説明（B は押せない）
 * - A か B があるとき: [A: 0:03] → [B: 0:04] [A−][A＋] [B−][B＋] (extra) [×]
 *   無い方の微調整ボタンは出さない（スマホの横幅を空けるため）
 *
 * A・B は使う側で持つ（この部品は表示とボタンだけ）。決まりは toggleA・toggleB・adjustA・adjustB（core）を使うとよい。
 * 見た目は '@shiodome47/ab-repeat/style.css'（.ab-repeat の中だけに効く）。
 */
export function ABRepeatControls({
  a,
  b,
  onToggleA,
  onToggleB,
  onAdjustA,
  onAdjustB,
  onClear,
  variant = 'normal',
  theme = 'system',
  step = AB_STEP,
  extra,
  labels: labelsProp,
  className,
}: ABRepeatControlsProps) {
  const labels = { ...JA_LABELS, ...labelsProp }
  const looping = a !== null && b !== null
  const editing = a !== null || b !== null
  const bDisabled = a === null && b === null

  return (
    <div
      className={['ab-repeat', variant === 'overlay' && 'ab-repeat--overlay', className].filter(Boolean).join(' ')}
      data-theme={theme}
      data-testid="ab-repeat"
    >
      <button
        type="button"
        onClick={onToggleA}
        title={a !== null ? labels.clearA : labels.setA}
        className="ab-repeat__toggle ab-repeat__toggle--a"
        data-state={a !== null ? 'set' : 'unset'}
      >
        A{a !== null ? `: ${formatTime(a)}` : ''}
      </button>

      {looping && (
        <span className="ab-repeat__arrow" aria-hidden="true">
          →
        </span>
      )}

      <button
        type="button"
        onClick={onToggleB}
        disabled={bDisabled}
        title={b !== null ? labels.clearB : a === null ? labels.needA : labels.setB}
        className="ab-repeat__toggle ab-repeat__toggle--b"
        data-state={b !== null ? 'set' : a !== null ? 'ready' : 'unset'}
      >
        B{b !== null ? `: ${formatTime(b)}` : ''}
      </button>

      {editing && (
        <>
          {a !== null && (
            <div className="ab-repeat__group ab-repeat__group--a">
              <button type="button" onClick={() => onAdjustA(-step)} title={labels.earlier('A', step)} className="ab-repeat__adjust">
                A-
              </button>
              <button type="button" onClick={() => onAdjustA(step)} title={labels.later('A', step)} className="ab-repeat__adjust">
                A+
              </button>
            </div>
          )}

          {b !== null && (
            <div className="ab-repeat__group">
              <button type="button" onClick={() => onAdjustB(-step)} title={labels.earlier('B', step)} className="ab-repeat__adjust">
                B-
              </button>
              <button type="button" onClick={() => onAdjustB(step)} title={labels.later('B', step)} className="ab-repeat__adjust">
                B+
              </button>
            </div>
          )}

          {extra}

          {/* 間を空けて、押し間違いを防ぐ */}
          <button type="button" onClick={onClear} title={labels.clear} aria-label={labels.clear} className="ab-repeat__clear">
            <ClearIcon />
          </button>
        </>
      )}

      {!editing && <span className="ab-repeat__hint">{labels.hint}</span>}
    </div>
  )
}
