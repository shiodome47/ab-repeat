import { useEffect, useRef, useState } from 'react'
import {
  ABRepeatControls,
  EMPTY_RANGE,
  EN_LABELS,
  adjustA,
  adjustB,
  createPolledABLoop,
  formatTime,
  isLooping,
  toggleA,
  toggleB,
  useVideoABLoop,
  type ABRange,
  type ABRepeatLabels,
  type ABRepeatTheme,
} from '@shiodome47/ab-repeat'
import { loadYouTubeApi, youTubeId, type YTPlayer } from './youtube'

/** ふつうの動画の見本（MDN が配っている、著作権のない CC0 の動画） */
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
/** YouTube の見本（Blender 財団の公開映画「Big Buck Bunny」） */
const SAMPLE_YOUTUBE = 'aqz-KE-bpKQ'

type Lang = 'ja' | 'en'

const TEXT = {
  ja: {
    lead: '動画の区間（A〜B）をくり返し再生する React の部品。',
    how: '再生しながら A を押し、続けて B を押すと、A〜B をくり返します。A−・A＋・B−・B＋ で 0.5 秒ずつ動かせます。× で解除。',
    video: 'ふつうの動画（<video>）',
    youtube: 'YouTube の埋め込み',
    loops: (n: number) => `${n} 回くり返しました`,
    now: '今',
    ytInput: 'YouTube の URL を貼って試す',
    show: '表示',
    labels: '文言',
    theme: '明るさ',
    themes: { system: '端末に合わせる', light: '明るい', dark: '暗い' },
    overlay: '動画の上（overlay）',
    on: 'オン',
    off: 'オフ',
  },
  en: {
    lead: 'A React part that repeats a section (A to B) of a video.',
    how: 'While playing, press A and then B to repeat A to B. A− / A+ / B− / B+ move a point by 0.5 s. × clears it.',
    video: 'Plain video (<video>)',
    youtube: 'YouTube embed',
    loops: (n: number) => `Repeated ${n} time${n === 1 ? '' : 's'}`,
    now: 'Now',
    ytInput: 'Paste a YouTube URL to try',
    show: 'Show',
    labels: 'Labels',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    overlay: 'Over the video (overlay)',
    on: 'On',
    off: 'Off',
  },
} as const

interface BarOptions {
  labels?: Partial<ABRepeatLabels>
  theme: ABRepeatTheme
  overlay: boolean
}

export function App() {
  const [lang, setLang] = useState<Lang>('ja')
  const [theme, setTheme] = useState<ABRepeatTheme>('system')
  const [overlay, setOverlay] = useState(false)
  const t = TEXT[lang]
  const bar: BarOptions = { labels: lang === 'en' ? EN_LABELS : undefined, theme, overlay }

  return (
    <div className="demo" data-theme={theme}>
      <main className="demo__main">
        <header>
          <h1>ab-repeat</h1>
          <p>{t.lead}</p>
          <p className="demo__muted">{t.how}</p>
          <pre className="demo__code">
            <code>npm install @shiodome47/ab-repeat</code>
          </pre>
          <Choice
            label={t.labels}
            value={lang}
            onChange={setLang}
            options={[
              ['ja', '日本語'],
              ['en', 'English'],
            ]}
          />
          <Choice
            label={t.theme}
            value={theme}
            onChange={setTheme}
            options={[
              ['system', t.themes.system],
              ['light', t.themes.light],
              ['dark', t.themes.dark],
            ]}
          />
          <Choice
            label={t.overlay}
            value={overlay ? 'on' : 'off'}
            onChange={(v) => setOverlay(v === 'on')}
            options={[
              ['on', t.on],
              ['off', t.off],
            ]}
          />
        </header>

        <section>
          <h2>{t.video}</h2>
          <PlainVideoDemo bar={bar} lang={lang} />
        </section>

        <section>
          <h2>{t.youtube}</h2>
          <YouTubeDemo bar={bar} lang={lang} />
        </section>

        <footer className="demo__footer">
          <a href="https://github.com/shiodome47/ab-repeat">GitHub</a>
          <a href="https://www.npmjs.com/package/@shiodome47/ab-repeat">npm</a>
        </footer>
      </main>
    </div>
  )
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div className="demo__choice" role="group" aria-label={label}>
      <span className="demo__muted">{label}:</span>
      {options.map(([v, text]) => (
        <button key={v} type="button" className="demo__btn" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

/** A・B を持ち、操作の列に渡す関数を作る（A・B は使う側で持つ） */
function useABRange(getTime: () => number, getDuration: () => number) {
  const [range, setRange] = useState<ABRange>(EMPTY_RANGE)
  const rangeRef = useRef(range)
  rangeRef.current = range
  return {
    range,
    rangeRef,
    handlers: {
      onToggleA: () => setRange((r) => toggleA(r, getTime())),
      onToggleB: () => setRange((r) => toggleB(r, getTime(), getDuration())),
      onAdjustA: (d: number) => setRange((r) => adjustA(r, d, getDuration())),
      onAdjustB: (d: number) => setRange((r) => adjustB(r, d, getDuration())),
      onClear: () => setRange(EMPTY_RANGE),
    },
  }
}

function Status({ loops, time, lang }: { loops: number; time: number; lang: Lang }) {
  const t = TEXT[lang]
  return (
    <p className="demo__muted demo__status" aria-live="polite">
      {t.loops(loops)} · {t.now} {formatTime(time)}
    </p>
  )
}

function Bar({ range, handlers, bar }: { range: ABRange; handlers: ReturnType<typeof useABRange>['handlers']; bar: BarOptions }) {
  return (
    <div className={bar.overlay ? 'demo__bar demo__bar--overlay' : 'demo__bar'}>
      <ABRepeatControls
        a={range.a}
        b={range.b}
        {...handlers}
        variant={bar.overlay ? 'overlay' : 'normal'}
        theme={bar.theme}
        labels={bar.labels}
      />
    </div>
  )
}

function PlainVideoDemo({ bar, lang }: { bar: BarOptions; lang: Lang }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loops, setLoops] = useState(0)
  const [time, setTime] = useState(0)
  const { range, rangeRef, handlers } = useABRange(
    () => videoRef.current?.currentTime ?? 0,
    () => videoRef.current?.duration || 0,
  )
  // B まで来たら A に戻す。ふつうに再生して B に届いたら 1 回と数える
  useVideoABLoop(videoRef, range, { onLoop: () => setLoops((n) => n + 1) })

  // B が動画の終わりのとき: 終わったら A に戻して続ける（終わったあとどうするかは使う側で決める）
  const onEnded = () => {
    const v = videoRef.current
    const r = rangeRef.current
    if (!v || !isLooping(r)) return
    v.currentTime = r.a
    setLoops((n) => n + 1)
    void v.play()
  }

  return (
    <>
      <div className="demo__player">
        <video
          ref={videoRef}
          src={SAMPLE_VIDEO}
          className="demo__fill"
          controls
          playsInline
          muted
          preload="metadata"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onEnded={onEnded}
        />
      </div>
      <Bar range={range} handlers={handlers} bar={bar} />
      <Status loops={loops} time={time} lang={lang} />
    </>
  )
}

function YouTubeDemo({ bar, lang }: { bar: BarOptions; lang: Lang }) {
  const t = TEXT[lang]
  const [videoId, setVideoId] = useState(SAMPLE_YOUTUBE)
  const [input, setInput] = useState('')
  const [loops, setLoops] = useState(0)
  const [time, setTime] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  /** 準備ができるまで YT.Player にはメソッドが無いので、呼ぶ前に確かめる */
  const ready = () => {
    const p = playerRef.current
    return p && typeof p.getCurrentTime === 'function' ? p : null
  }
  const { range, rangeRef, handlers } = useABRange(
    () => ready()?.getCurrentTime() ?? 0,
    () => ready()?.getDuration() ?? 0,
  )

  useEffect(() => {
    let cancelled = false
    void loadYouTubeApi().then(() => {
      const box = boxRef.current
      if (cancelled || !box || !window.YT) return
      // YT.Player は渡した要素を iframe に置き換えるので、毎回、中に新しい要素を作って渡す
      box.innerHTML = ''
      const placeholder = document.createElement('div')
      box.appendChild(placeholder)
      playerRef.current = new window.YT.Player(placeholder, {
        videoId,
        playerVars: { rel: 0, playsinline: 1 },
        events: {
          onStateChange: (e) => {
            // B が動画の終わりのとき: 終わったら A に戻して続ける
            const r = rangeRef.current
            if (e.data === 0 && isLooping(r)) {
              ready()?.seekTo(r.a, true)
              setLoops((n) => n + 1)
              ready()?.playVideo()
            }
          },
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // YouTube は位置を知らせてくれないので、0.1 秒ごとに読みに行き、B を過ぎていたら A に戻す
  useEffect(() => {
    const loop = createPolledABLoop({
      seek: (a) => ready()?.seekTo(a, true),
      onLoop: () => setLoops((n) => n + 1),
    })
    const id = setInterval(() => {
      const p = ready()
      if (!p) return
      const now = p.getCurrentTime()
      setTime(now)
      loop.check(now, rangeRef.current)
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = youTubeId(input)
    if (id) {
      handlers.onClear()
      setLoops(0)
      setVideoId(id)
    }
  }
  const inputId = youTubeId(input)

  return (
    <>
      <div className="demo__player demo__player--16x9">
        <div ref={boxRef} className="demo__fill demo__yt" />
      </div>
      <Bar range={range} handlers={handlers} bar={bar} />
      <Status loops={loops} time={time} lang={lang} />
      <form className="demo__form" onSubmit={submit}>
        <label htmlFor="yt-url" className="demo__muted">
          {t.ytInput}
        </label>
        <div className="demo__row">
          <input
            id="yt-url"
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="demo__btn" disabled={!inputId}>
            {t.show}
          </button>
        </div>
      </form>
    </>
  )
}
