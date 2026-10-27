import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithInspection } from '../../test/render'
import { CameraInspection } from './CameraInspection'

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true })
}

beforeEach(() => {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
})
afterEach(() => {
  setMediaDevices(undefined)
})

describe('CameraInspection', () => {
  it('offers the native-camera upload fallback when live camera is unsupported', () => {
    setMediaDevices(undefined)
    renderWithInspection(<CameraInspection />)
    expect(screen.getByText('الكاميرا المباشرة غير مدعومة في هذا المتصفح')).toBeInTheDocument()
    expect(screen.getByLabelText('رفع صورة من كاميرا الهاتف')).toHaveAttribute('capture', 'environment')
  })

  it('requests video only, never audio', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'NotAllowedError' }))
    setMediaDevices({ getUserMedia })
    renderWithInspection(<CameraInspection />)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكاميرا الخلفية' }))
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }))
  })

  it('explains permission denial and keeps the upload fallback', async () => {
    setMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'NotAllowedError' })) })
    renderWithInspection(<CameraInspection />)
    await userEvent.click(screen.getByRole('button', { name: 'تشغيل الكاميرا الخلفية' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('تم رفض إذن الكاميرا'))
    expect(screen.getByLabelText('رفع صورة من كاميرا الهاتف')).toBeInTheDocument()
  })

  it('does not save an uploaded photo until the user agrees', async () => {
    setMediaDevices(undefined)
    renderWithInspection(<CameraInspection />)
    const file = new File(['img'], 'a.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('رفع صورة من كاميرا الهاتف'), file)
    expect(await screen.findByRole('dialog', { name: 'مراجعة الصورة' })).toBeInTheDocument()
    expect(screen.getByText(/لم تُحفظ ولم تُرسل لأي مكان/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'تجاهل الصورة' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
