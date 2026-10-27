import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const IconSteps = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 6h10M4 12h16M4 18h7" /><circle cx="18" cy="6" r="2" /></svg>
)
export const IconCar = (p: IconProps) => (
  <svg {...base} {...p}><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v2H3z" /><circle cx="7.5" cy="13" r="1" /><circle cx="16.5" cy="13" r="1" /></svg>
)
export const IconCamera = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
)
export const IconMagnet = (p: IconProps) => (
  <svg {...base} {...p}><path d="M6 4v8a6 6 0 0 0 12 0V4" /><path d="M6 8h4M14 8h4M10 4v8a2 2 0 0 0 4 0V4" /></svg>
)
export const IconBluetooth = (p: IconProps) => (
  <svg {...base} {...p}><path d="m7 7 10 10-5 4V3l5 4L7 17" /></svg>
)
export const IconReport = (p: IconProps) => (
  <svg {...base} {...p}><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
)
export const IconSettings = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
)
