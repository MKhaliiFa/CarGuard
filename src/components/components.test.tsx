import { render, screen } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStorageHandle, savePhoto } from '../lib/storage'
import { PhotoThumb } from './PhotoThumb'
import { Sparkline } from './Sparkline'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})

describe('shared components', () => {
  it('Sparkline renders nothing without enough data', () => {
    const { container } = render(<Sparkline values={[1]} label="x" />)
    expect(container.innerHTML).toBe('')
  })

  it('Sparkline renders a path and baseline', () => {
    render(<Sparkline values={[1, 2, 3]} baseline={2} label="خط" />)
    const svg = screen.getByRole('img', { name: 'خط' })
    expect(svg.querySelector('path')).not.toBeNull()
    expect(svg.querySelector('line')).not.toBeNull()
  })

  it('PhotoThumb shows a stored photo', async () => {
    await savePhoto({ id: 'p', zoneId: 'obd', blob: new Blob(['x'], { type: 'image/jpeg' }), createdAt: 'T' })
    render(<PhotoThumb photoId="p" alt="صورة" />)
    expect(await screen.findByAltText('صورة')).toHaveAttribute('src', 'blob:x')
  })

  it('PhotoThumb reports a missing photo', async () => {
    render(<PhotoThumb photoId="missing" alt="صورة" />)
    expect(await screen.findByText('غير متاحة')).toBeInTheDocument()
  })
})
