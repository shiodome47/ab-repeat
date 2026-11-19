# @shiodome47/ab-repeat

動画の区間（A 地点〜B 地点）を決めて、**くり返し再生する** React の部品です。
ふつうの動画（`<video>`）にも、YouTube の埋め込みにも使えます。

- 見本: （公開したら、ここに Vercel の URL を書く）
- English: [see below](#english)

## できること

- **操作の列**（`<ABRepeatControls>`）: A・B のボタン、微調整（A−・A＋・B−・B＋）、×（解除）。
  「区間を保存」などのボタンを差し込む場所（`extra`）もある
- **ふつうの動画（`<video>`）のループ**（`useVideoABLoop`）: B まで来たら A に戻す。
  再生中は画面の描き直しのたび（約 60 回/秒）に確かめるので、B を過ぎて次の場面が見えてしまわない
- **YouTube などのループ**（`createPolledABLoop`）: 位置を自分で読みに行くプレイヤー用。使う側の setInterval の中で呼ぶ。
  YouTube が A に戻したあともしばらく前の位置を返す間は、数えない・戻し直しすぎない
- **くり返しの回数**: ふつうに再生して B に届いたときだけ `onLoop` を呼ぶ
  （シークで B を越えたとき・別の区間に切り替えた直後は呼ばない）
- **A・B の計算**（画面に頼らない）: `toggleA`・`toggleB`・`adjustA`・`adjustB`・`setRange`。
  B は必ず A より 0.1 秒以上後ろ。0 より前・動画の終わりより後ろへは行かない
- 明るい・暗い表示、動画の上（黒い帯の上）に置く表示
- 文言は日本語が既定。英語（`EN_LABELS`）や、自分の言葉に差し替えられる

A・B は**使う側で持ちます**（`useState`・store など）。保存するか（ページを開き直しても残すか）も、使う側で決めます。

## 入れ方

```bash
npm install @shiodome47/ab-repeat
```

React 18 が必要です（`peerDependencies`。使う側のアプリに入っている React を使います）。
ほかに入れるものはありません（アイコンも部品の中に持っています）。

## 使い方

```tsx
import { useRef, useState } from 'react'
import {
  ABRepeatControls,
  EMPTY_RANGE,
  adjustA,
  adjustB,
  toggleA,
  toggleB,
  useVideoABLoop,
  type ABRange,
} from '@shiodome47/ab-repeat'
import '@shiodome47/ab-repeat/style.css' // 見た目（1 回だけ読み込む）

export function Player({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [range, setRange] = useState<ABRange>(EMPTY_RANGE)
  const [loops, setLoops] = useState(0)
  // B まで来たら A に戻す。ふつうに再生して B に届いたら onLoop
  useVideoABLoop(videoRef, range, { onLoop: () => setLoops((n) => n + 1) })

  const now = () => videoRef.current?.currentTime ?? 0
  const dur = () => videoRef.current?.duration || 0
  return (
    <>
      <video ref={videoRef} src={src} controls playsInline />
      <ABRepeatControls
        a={range.a}
        b={range.b}
        onToggleA={() => setRange((r) => toggleA(r, now()))}
        onToggleB={() => setRange((r) => toggleB(r, now(), dur()))}
        onAdjustA={(d) => setRange((r) => adjustA(r, d, dur()))}
        onAdjustB={(d) => setRange((r) => adjustB(r, d, dur()))}
        onClear={() => setRange(EMPTY_RANGE)}
      />
      <p>{loops} 回くり返しました</p>
    </>
  )
}
```

### YouTube（IFrame API）

YouTube は位置を知らせてくれないので、0.1 秒ごとに読みに行き、そのたびに `check()` を呼びます。

```ts
const loop = createPolledABLoop({
  seek: (a) => player.seekTo(a, true),
  onLoop: () => countUp(),
})
const id = setInterval(() => {
  loop.check(player.getCurrentTime(), getRange()) // getRange() は今の A・B
}, 100)
```

### B が動画の終わりのとき

動画が終わった（`ended`）あとに、A に戻して続けるか、次の動画へ進むかは使う側で決めます。
見本のページ（[`examples/web/src/App.tsx`](examples/web/src/App.tsx)）では、A に戻して続けています。

## `<ABRepeatControls>` の props

| 名前 | 型 | 説明 |
|---|---|---|
| `a`・`b` | `number \| null` | A・B（秒）。無い方は null |
| `onToggleA`・`onToggleB` | `() => void` | A・B のボタン（ふつうは `toggleA`・`toggleB` で次の A・B を作る） |
| `onAdjustA`・`onAdjustB` | `(delta: number) => void` | 微調整（delta は ±`step`） |
| `onClear` | `() => void` | ×（A・B とも外す） |
| `variant` | `'normal' \| 'overlay'` | `'overlay'` は動画の上・黒い帯の上に置くとき（白い文字。`theme` にかかわらず） |
| `theme` | `'light' \| 'dark' \| 'system'` | 明るい・暗い（既定は `'system'`: 端末の設定に合わせる） |
| `step` | `number` | 微調整の幅（秒。既定 0.5） |
| `extra` | `ReactNode` | × の前に置くもの（「区間を保存」など） |
| `labels` | `Partial<ABRepeatLabels>` | 文言。変えたいものだけ（既定は日本語。英語は `EN_LABELS`）。キーボードのショートカットの説明を足すときなどに |
| `className` | `string` | いちばん外の要素に足す |

## そのほかの関数

| 名前 | 説明 |
|---|---|
| `useVideoABLoop(videoRef, range, { onLoop })` | `<video>` のループ（React） |
| `attachVideoABLoop(video, { getRange, onLoop })` | 同じもの（React なし）。`refresh()`・`detach()` を返す |
| `createPolledABLoop({ seek, onLoop, retryMs })` | 位置を読みに行くプレイヤーのループ。`check(t, range)`・`reset()` を返す |
| `toggleA`・`toggleB`・`adjustA`・`adjustB`・`setA`・`setRange` | 次の A・B を返す（変わらないときは、渡したものをそのまま返す） |
| `isLooping(range)` | A・B の両方があるか |
| `isPlayedThrough(before, a, b)` | ふつうに再生して B に届いたか（くり返しと数えるか） |
| `formatTime(seconds)` | 「分:秒」（例: `83` → `1:23`） |
| `EMPTY_RANGE`・`AB_STEP`・`MIN_GAP`・`PLAYED_THROUGH_WINDOW` | 決まった値 |

## 見た目

`style.css` は `.ab-repeat`（部品のいちばん外の要素）の中だけに効きます。使う側のページの見た目は変えません。
色や大きさは `--ab-…` の変数で変えられます（`src/style.css` の先頭に一覧があります）。

```css
.ab-repeat {
  --ab-a-text: #2563eb;
  --ab-a-bg: #dbeafe;
}
```

## 使っているアプリ

- 手話学習アプリ（[shiodome47/shuwa-video-player](https://github.com/shiodome47/shuwa-video-player)）

## 開発

```bash
npm ci
npm test            # テスト
npm run typecheck   # 型の確かめ
npm run build       # dist/ を作る
npm run dev         # 見本のページ（http://localhost:5173）
```

npm への公開の手順は [`PUBLISHING.md`](PUBLISHING.md)。

---

## English

A React part that repeats a section (point A to point B) of a video — plain `<video>` or a YouTube embed.

```bash
npm install @shiodome47/ab-repeat
```

```tsx
import { ABRepeatControls, EMPTY_RANGE, EN_LABELS, adjustA, adjustB, toggleA, toggleB, useVideoABLoop } from '@shiodome47/ab-repeat'
import '@shiodome47/ab-repeat/style.css'
```

- `<ABRepeatControls>`: the A / B buttons, fine adjustment (A− A+ B− B+), clear (×) and a slot for your own buttons (`extra`).
  You keep A and B in your own state; use `toggleA` / `toggleB` / `adjustA` / `adjustB` to compute the next range.
- `useVideoABLoop(videoRef, range, { onLoop })`: jumps back to A when a `<video>` reaches B. Checks every animation frame while playing, so it doesn't overshoot B.
- `createPolledABLoop({ seek, onLoop })`: for players you poll (e.g. the YouTube IFrame API). Call `check(currentTime, range)` from your own interval.
- `onLoop` fires only when playback actually reaches B (not when seeking past it), so you can count repetitions.
- `theme`: `'light' | 'dark' | 'system'`; `variant="overlay"` for a bar on top of / below a black video area.
- Labels default to Japanese; pass `labels={EN_LABELS}` or any partial override.
- The stylesheet only affects elements inside `.ab-repeat`. Customize with the `--ab-*` CSS variables.
- Peer dependency: React 18. MIT licensed.
