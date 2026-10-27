import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InstallGuide } from './InstallGuide'

describe('InstallGuide', () => {
  it('shows manual steps for both platforms without an install prompt', () => {
    render(<InstallGuide />)
    expect(screen.getByRole('heading', { name: 'أندرويد (كروم)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'آيفون (سفاري)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'تثبيت التطبيق الآن' })).not.toBeInTheDocument()
  })

  it('offers a one-tap install only when the browser fires beforeinstallprompt', async () => {
    render(<InstallGuide />)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => {
      window.dispatchEvent(event)
    })
    await userEvent.click(screen.getByRole('button', { name: 'تثبيت التطبيق الآن' }))
    expect(event.prompt).toHaveBeenCalled()
    expect(await screen.findByText('تم التثبيت.')).toBeInTheDocument()
  })
})
