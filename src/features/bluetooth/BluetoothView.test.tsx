import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectNoDetectionClaims, renderWithInspection } from '../../test/render'
import { BluetoothView } from './BluetoothView'

function setBluetooth(value: unknown) {
  Object.defineProperty(navigator, 'bluetooth', { value, configurable: true })
}

afterEach(() => {
  delete (navigator as Navigator & { bluetooth?: unknown }).bluetooth
})

function fakeBt(requestDevice: () => Promise<unknown>) {
  const bt = new EventTarget() as EventTarget & Record<string, unknown>
  bt.requestDevice = vi.fn(requestDevice)
  bt.getAvailability = async () => true
  return bt
}

describe('BluetoothView', () => {
  it('explains lack of support and never shows a device list', () => {
    renderWithInspection(<BluetoothView />)
    expect(screen.getByText('البلوتوث من المتصفح غير مدعوم هنا')).toBeInTheDocument()
    expect(screen.queryByText(/الأجهزة التي استقبلها المتصفح/)).not.toBeInTheDocument()
    expect(screen.queryByText(/dBm/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /أندرويد: تنبيهات أجهزة التتبع/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /آيفون: تنبيهات التتبع/ })).toBeInTheDocument()
  })

  it('reports permission denial without fabricating results', async () => {
    setBluetooth(fakeBt(() => Promise.reject(Object.assign(new Error('no'), { name: 'SecurityError' }))))
    renderWithInspection(<BluetoothView />)
    await userEvent.click(screen.getByRole('button', { name: 'اختيار جهاز قريب' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('رفض المتصفح أو النظام إذن البلوتوث'))
    expect(screen.queryByText(/dBm/)).not.toBeInTheDocument()
  })

  it('handles a cancelled chooser', async () => {
    setBluetooth(fakeBt(() => Promise.reject(Object.assign(new Error('x'), { name: 'NotFoundError' }))))
    renderWithInspection(<BluetoothView />)
    await userEvent.click(screen.getByRole('button', { name: 'اختيار جهاز قريب' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('لم يتم اختيار أي جهاز'))
  })

  it('shows a chosen device but says RSSI was not provided', async () => {
    setBluetooth(fakeBt(() => Promise.resolve(Object.assign(new EventTarget(), { id: 'abc==', name: 'Unknown Tag' }))))
    renderWithInspection(<BluetoothView />)
    expect(screen.queryByRole('button', { name: 'بدء المسح' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'اختيار جهاز قريب' }))
    expect(await screen.findByText('Unknown Tag')).toBeInTheDocument()
    expect(screen.getByText('لم يوفّرها المتصفح')).toBeInTheDocument()
    expect(screen.queryByText(/dBm/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'تسجيل كملاحظة' }))
    expect(screen.getByRole('status')).toHaveTextContent('ملاحظة غير حاسمة')
    expectNoDetectionClaims(document.body.textContent ?? '')
  })
})
