import { useEffect, useRef, useState } from 'react'
import { setIntroSeen } from '../lib/prefs'

interface Slide {
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  readonly points?: readonly string[]
}

const SLIDES: readonly Slide[] = [
  {
    eyebrow: 'CARGUARD',
    title: 'افحص سيارتك بخطوات واضحة',
    body: 'دليل منظّم يساعدك على فحص سيارتك بنفسك بحثًا عن أجهزة تتبع أو تسجيل مشتبه بها، وتوثيق ما تراه.',
  },
  {
    eyebrow: 'HOW IT WORKS',
    title: 'رحلة فحص من سبع خطوات',
    body: 'يرشدك التطبيق من التجهيز حتى التقرير:',
    points: ['تفحص المناطق المعروفة واحدة تلو الأخرى.', 'تستخدم الكاميرا والمستشعرات المتاحة في هاتفك.', 'تسجّل ملاحظاتك وصورك على جهازك فقط.'],
  },
  {
    eyebrow: 'HONEST LIMITS',
    title: 'القرار لك بعد المعاينة',
    body: 'التطبيق لا يكشف الأجهزة تلقائيًا ولا يرى عبر ألواح السيارة. هو يساعدك على فحص منظم، ولا يرسل أي بيانات خارج جهازك.',
  },
]

const EXIT_MS = 320

interface IntroProps {
  readonly onClose: () => void
}

/** First-launch introduction. Skippable at every point; the choice is remembered on this device. */
export function Intro({ onClose }: IntroProps) {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const slide = SLIDES[index] ?? SLIDES[0]!
  const last = index === SLIDES.length - 1

  const close = () => {
    setIntroSeen(true)
    setLeaving(true)
  }

  useEffect(() => {
    primaryRef.current?.focus()
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setIntroSeen(true)
      setLeaving(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Unmount after the exit animation. A timer (not animationend) so it also works with motion reduced or CSS missing.
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onClose, EXIT_MS)
    return () => clearTimeout(t)
  }, [leaving, onClose])

  return (
    <div
      className={`intro${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      <div className="intro-inner">
        <button type="button" className="intro-skip" onClick={close}>تخطي المقدمة</button>

        <div className="intro-visual" aria-hidden="true">
          <svg viewBox="0 0 200 200" className="intro-scanner">
            <defs>
              <linearGradient id="intro-sweep" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--c-accent)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--c-accent)" stopOpacity="0.55" />
              </linearGradient>
              <clipPath id="intro-clip"><circle cx="100" cy="100" r="86" /></clipPath>
            </defs>
            <circle cx="100" cy="100" r="86" className="intro-ring" />
            <circle cx="100" cy="100" r="62" className="intro-ring intro-ring--inner" />
            <g clipPath="url(#intro-clip)">
              <path className="intro-car" d="M78 40c0-6 6-10 22-10s22 4 22 10l4 24v76l-4 22c-1 6-8 10-22 10s-21-4-22-10l-4-22V64z" />
              <path className="intro-car-detail" d="M80 66h40M82 74c6-3 30-3 36 0M82 132c6 3 30 3 36 0M78 100h44" />
              <rect className="intro-sweep" x="0" y="-60" width="200" height="60" fill="url(#intro-sweep)" />
            </g>
          </svg>
        </div>

        <div className="intro-copy" key={index}>
          <div className="eyebrow">{slide.eyebrow}</div>
          <h2 id="intro-title">{slide.title}</h2>
          <p className="muted">{slide.body}</p>
          {slide.points && (
            <ul className="intro-points">
              {slide.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>

        <div className="intro-dots" aria-label={`الشاشة ${index + 1} من ${SLIDES.length}`} role="img">
          {SLIDES.map((s, i) => <span key={s.title} className={i === index ? 'is-active' : undefined} />)}
        </div>

        <div className="intro-actions">
          {index > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setIndex((i) => i - 1)}>السابق</button>
          )}
          <button
            type="button"
            ref={primaryRef}
            className="btn btn--primary btn--lg"
            style={{ flex: 1 }}
            onClick={() => (last ? close() : setIndex((i) => i + 1))}
          >
            {last ? 'ابدأ الفحص' : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  )
}
