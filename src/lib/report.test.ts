import { describe, expect, it } from 'vitest'
import { createInitialState, inspectionReducer } from '../state/inspectionReducer'
import { expectNoDetectionClaims } from '../test/render'
import { REPORT_DISCLAIMER, buildHtmlReport, buildJsonExport, escapeHtml } from './report'

describe('report', () => {
  it('always includes the disclaimer and never claims a detection', () => {
    let s = createInitialState()
    s = inspectionReducer(s, {
      type: 'addObservation',
      observation: { id: '1', zoneId: 'obd', kind: 'magnetic', source: 'sensor', classification: 'confirmed', text: 'قراءة', createdAt: 'T' },
    })
    const html = buildHtmlReport(s)
    expect(html).toContain(escapeHtml(REPORT_DISCLAIMER))
    expect(html).toContain('مؤشر مشتبه به')
    expect(html).not.toContain('مؤكدة بالمعاينة')
    expectNoDetectionClaims(html)
  })

  it('escapes user text', () => {
    const s = inspectionReducer(createInitialState(), { type: 'setZoneNotes', zoneId: 'obd', notes: '<script>alert(1)</script>', at: 'T' })
    const html = buildHtmlReport(s)
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('omits photos unless explicitly provided, and only accepts image data URLs', () => {
    const s = inspectionReducer(createInitialState(), { type: 'attachPhoto', zoneId: 'obd', photoId: 'p', at: 'T' })
    expect(buildHtmlReport(s)).toContain('لم تُضمَّن في التقرير')
    expect(buildHtmlReport(s, new Map([['p', 'javascript:alert(1)']]))).not.toContain('javascript:')
    expect(buildHtmlReport(s, new Map([['p', 'data:image/jpeg;base64,AAAA']]))).toContain('data:image/jpeg;base64,AAAA')
  })

  it('includes detector metadata and manual-review checks, escaped', () => {
    const s = inspectionReducer(createInitialState(), {
      type: 'addObservation',
      observation: {
        id: '1', zoneId: 'obd', kind: 'visual', source: 'user', classification: 'suspicious', text: 'x', createdAt: 'T',
        detection: { label: 'cell phone', labelAr: 'هاتف محمول', score: 0.61, widthPx: 60, heightPx: 110 },
        review: { checks: ['عليه ضوء <b>'], location: 'خلف الغطاء' },
      },
    })
    const html = buildHtmlReport(s)
    expect(html).toContain('هاتف محمول (cell phone) بثقة 61%')
    expect(html).toContain('60×110 بكسل')
    expect(html).toContain('عليه ضوء &lt;b&gt;')
    expectNoDetectionClaims(html)
  })

  it('exports JSON with the disclaimer', () => {
    const parsed = JSON.parse(buildJsonExport(createInitialState())) as { disclaimer: string; state: { version: number } }
    expect(parsed.disclaimer).toBe(REPORT_DISCLAIMER)
    expect(parsed.state.version).toBe(1)
  })
})
