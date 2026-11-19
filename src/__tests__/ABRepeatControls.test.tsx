import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ABRepeatControls, EN_LABELS } from '../index'

function setup(props: Partial<Parameters<typeof ABRepeatControls>[0]> = {}) {
  const handlers = {
    onToggleA: vi.fn(),
    onToggleB: vi.fn(),
    onAdjustA: vi.fn(),
    onAdjustB: vi.fn(),
    onClear: vi.fn(),
  }
  render(<ABRepeatControls a={null} b={null} {...handlers} {...props} />)
  return handlers
}

describe('A-B リピートの操作の列', () => {
  it('A・B が無いとき: A・B（B は押せない）と説明だけ', () => {
    setup()
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('title', 'A地点を設定')
    expect(screen.getByRole('button', { name: 'B' })).toBeDisabled()
    expect(screen.getByText('A → B でリピート区間を設定')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A-' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'A-Bリピートを解除' })).not.toBeInTheDocument()
  })

  it('A だけのとき: A の時刻と A の微調整、×。B の微調整は出さない', () => {
    const h = setup({ a: 3.4 })
    expect(screen.getByRole('button', { name: 'A: 0:03' })).toHaveAttribute('data-state', 'set')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('data-state', 'ready')
    fireEvent.click(screen.getByRole('button', { name: 'A-' }))
    expect(h.onAdjustA).toHaveBeenCalledWith(-0.5)
    fireEvent.click(screen.getByRole('button', { name: 'A+' }))
    expect(h.onAdjustA).toHaveBeenCalledWith(0.5)
    expect(screen.queryByRole('button', { name: 'B-' })).not.toBeInTheDocument()
  })

  it('A・B があるとき: → と両方の微調整。ボタンで使う側の関数を呼ぶ', () => {
    const h = setup({ a: 3, b: 83, step: 0.25 })
    expect(screen.getByText('→')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'B: 1:23' }))
    expect(h.onToggleB).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'B-' }))
    expect(h.onAdjustB).toHaveBeenCalledWith(-0.25)
    fireEvent.click(screen.getByRole('button', { name: 'A-Bリピートを解除' }))
    expect(h.onClear).toHaveBeenCalledTimes(1)
  })

  it('extra は × の前に置く', () => {
    setup({ a: 3, b: 8, extra: <button type="button">区間を保存</button> })
    const buttons = screen.getAllByRole('button').map((b) => b.textContent || b.getAttribute('aria-label'))
    expect(buttons.slice(-2)).toEqual(['区間を保存', 'A-Bリピートを解除'])
  })

  it('文言を差し替えられる（英語・一部だけ）', () => {
    setup({ a: 3, labels: { ...EN_LABELS, clearA: 'Clear A (a)' } })
    expect(screen.getByRole('button', { name: 'A: 0:03' })).toHaveAttribute('title', 'Clear A (a)')
    expect(screen.getByRole('button', { name: 'A-' })).toHaveAttribute('title', 'Move A 0.5s earlier')
    expect(screen.getByRole('button', { name: 'Clear A-B repeat' })).toBeInTheDocument()
  })

  it('明るい・暗い・動画の上（overlay）を、外の要素の印で分ける', () => {
    const { rerender } = render(
      <ABRepeatControls a={null} b={null} onToggleA={vi.fn()} onToggleB={vi.fn()} onAdjustA={vi.fn()} onAdjustB={vi.fn()} onClear={vi.fn()} theme="dark" />,
    )
    const root = screen.getByTestId('ab-repeat')
    expect(root).toHaveAttribute('data-theme', 'dark')
    expect(root).not.toHaveClass('ab-repeat--overlay')
    rerender(
      <ABRepeatControls a={null} b={null} onToggleA={vi.fn()} onToggleB={vi.fn()} onAdjustA={vi.fn()} onAdjustB={vi.fn()} onClear={vi.fn()} variant="overlay" />,
    )
    expect(screen.getByTestId('ab-repeat')).toHaveClass('ab-repeat', 'ab-repeat--overlay')
    expect(screen.getByTestId('ab-repeat')).toHaveAttribute('data-theme', 'system')
  })
})
