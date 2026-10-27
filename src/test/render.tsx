import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { InspectionProvider } from '../state/InspectionContext'

export function renderWithInspection(ui: ReactElement): RenderResult {
  return render(<InspectionProvider>{ui}</InspectionProvider>)
}

/** Every user-visible phrase that would amount to claiming a detection. None may ever appear. */
export const FORBIDDEN_CLAIMS = [/تم (اكتشاف|كشف|العثور على) (جهاز|أجهزة)/, /تم تحديد (مكان|موقع) الجهاز/, /جهاز تتبع مكتشف/, /detected/i]

export function expectNoDetectionClaims(text: string): void {
  for (const pattern of FORBIDDEN_CLAIMS) expect(text).not.toMatch(pattern)
}
