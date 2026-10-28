import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasSeenIntro } from '../lib/prefs'
import { expectNoDetectionClaims } from '../test/render'
import { Intro } from './Intro'

beforeEach(() => localStorage.clear())

describe('Intro', () => {
  it('walks through the slides and remembers completion', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Intro onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: 'افحص سيارتك بخطوات واضحة' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByRole('heading', { name: 'رحلة فحص من سبع خطوات' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'السابق' }))
    expect(screen.getByRole('heading', { name: 'افحص سيارتك بخطوات واضحة' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    await user.click(screen.getByRole('button', { name: 'التالي' }))
    expect(screen.getByText(/لا يكشف الأجهزة تلقائيًا/)).toBeInTheDocument()
    expectNoDetectionClaims(document.body.textContent ?? '')

    await user.click(screen.getByRole('button', { name: 'ابدأ الفحص' }))
    expect(hasSeenIntro()).toBe(true)
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('can be skipped from the first screen, and Escape skips too', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { unmount } = render(<Intro onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'تخطي المقدمة' }))
    expect(hasSeenIntro()).toBe(true)
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    unmount()

    localStorage.clear()
    const onClose2 = vi.fn()
    render(<Intro onClose={onClose2} />)
    await user.keyboard('{Escape}')
    expect(hasSeenIntro()).toBe(true)
    await waitFor(() => expect(onClose2).toHaveBeenCalledOnce())
  })

  it('still closes when storage throws (private mode)', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onClose = vi.fn()
    render(<Intro onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'تخطي المقدمة' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(errors).toHaveBeenCalled()
    spy.mockRestore()
    errors.mockRestore()
  })
})
