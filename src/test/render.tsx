import { render, waitFor, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { InspectionProvider, useInspection } from '../state/InspectionContext'

/** Exposes the provider's hydration flag so tests can wait for the IndexedDB load to finish. */
function HydrationProbe() {
  const { ready } = useInspection()
  return <span hidden data-inspection-ready={ready ? 'true' : 'false'} />
}

export function renderWithInspection(ui: ReactElement): RenderResult {
  return render(
    <InspectionProvider>
      {ui}
      <HydrationProbe />
    </InspectionProvider>,
  )
}

/** Resolves once stored state has been loaded; actions dispatched earlier are replaced by the hydrate. */
export async function waitForHydration(): Promise<void> {
  await waitFor(() => expect(document.querySelector('[data-inspection-ready="true"]')).not.toBeNull())
}

/** Every user-visible phrase that would amount to claiming a detection. None may ever appear. */
export const FORBIDDEN_CLAIMS = [/تم (اكتشاف|كشف|العثور على) (جهاز|أجهزة)/, /تم تحديد (مكان|موقع) الجهاز/, /جهاز تتبع مكتشف/, /detected/i]

export function expectNoDetectionClaims(text: string): void {
  for (const pattern of FORBIDDEN_CLAIMS) expect(text).not.toMatch(pattern)
}
