import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapCameraError, useCamera } from './useCamera'

function fakeStream(caps: Record<string, unknown>) {
  const track = { stop: vi.fn(), getCapabilities: () => caps, applyConstraints: vi.fn().mockResolvedValue(undefined) }
  return { track, stream: { getVideoTracks: () => [track], getTracks: () => [track] } }
}

beforeEach(() => Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true }))
afterEach(() => Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }))

describe('useCamera', () => {
  it('maps browser errors', () => {
    expect(mapCameraError(new DOMException('', 'NotAllowedError'))).toBe('denied')
    expect(mapCameraError(new DOMException('', 'NotFoundError'))).toBe('not_found')
    expect(mapCameraError(new DOMException('', 'NotReadableError'))).toBe('in_use')
    expect(mapCameraError(new DOMException('', 'SecurityError'))).toBe('insecure')
    expect(mapCameraError('weird')).toBe('unknown')
  })

  it('refuses to start outside a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn() }, configurable: true })
    const { result } = renderHook(() => useCamera())
    await act(() => result.current.start())
    expect(result.current.error).toBe('insecure')
  })

  it('exposes torch and zoom only when the track reports them, and releases the camera on stop', async () => {
    const { stream, track } = fakeStream({ torch: true, zoom: { min: 1, max: 5, step: 0.5 } })
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn().mockResolvedValue(stream) }, configurable: true })
    const { result } = renderHook(() => useCamera())
    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('live'))
    expect(result.current.torchAvailable).toBe(true)
    expect(result.current.zoomRange).toEqual({ min: 1, max: 5, step: 0.5 })

    await act(() => result.current.setTorch(true))
    expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] })
    expect(result.current.torchOn).toBe(true)
    await act(() => result.current.setZoom(2))
    expect(result.current.zoom).toBe(2)

    act(() => result.current.stop())
    expect(track.stop).toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('reports no torch or zoom when capabilities are absent', async () => {
    const { stream } = fakeStream({})
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn().mockResolvedValue(stream) }, configurable: true })
    const { result } = renderHook(() => useCamera())
    await act(() => result.current.start())
    expect(result.current.torchAvailable).toBe(false)
    expect(result.current.zoomRange).toBeUndefined()
  })
})
