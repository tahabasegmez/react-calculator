import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate } from './client'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  fetchMock.mockReset()
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// A fetch that only settles when its signal is aborted.
function hangingFetch(): typeof fetch {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError')),
      )
    })
}

describe('calculate', () => {
  it('posts the operation as JSON and returns the result', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { operation: 'add', result: '0.3' }))

    const result = await calculate({ operation: 'add', operands: ['0.1', '0.2'] })

    expect(result).toEqual({ ok: true, result: '0.3' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/calculate')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ operation: 'add', operands: ['0.1', '0.2'] })
  })

  it.each([
    [422, 'DIVISION_BY_ZERO'],
    [422, 'UNDEFINED_RESULT'],
    [400, 'INVALID_NUMBER'],
  ])('returns the error code of a %i response: %s', async (status, code) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { error: { code, message: 'x' } }))

    expect(await calculate({ operation: 'divide', operands: ['1', '0'] })).toEqual({
      ok: false,
      code,
    })
  })

  it.each([
    [
      'a 500 JSON error',
      () => jsonResponse(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } }),
    ],
    ['a 502 HTML page', () => new Response('<html>Bad Gateway</html>', { status: 502 })],
    ['a non-JSON success body', () => new Response('ok', { status: 200 })],
    ['a success body without a result', () => jsonResponse(200, { operation: 'add' })],
    ['an error body without a code', () => jsonResponse(400, { message: 'x' })],
  ])('returns NETWORK_ERROR for %s', async (_name, response) => {
    fetchMock.mockResolvedValue(response())

    expect(await calculate({ operation: 'add', operands: ['1', '2'] })).toEqual({
      ok: false,
      code: 'NETWORK_ERROR',
    })
  })

  it('returns NETWORK_ERROR when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    expect(await calculate({ operation: 'add', operands: ['1', '2'] })).toEqual({
      ok: false,
      code: 'NETWORK_ERROR',
    })
  })

  it('aborts and returns NETWORK_ERROR after 5 seconds', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(hangingFetch())

    const pending = calculate({ operation: 'add', operands: ['1', '2'] })
    await vi.advanceTimersByTimeAsync(4999)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toEqual({ ok: false, code: 'NETWORK_ERROR' })
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  it('aborts the request when the caller aborts', async () => {
    fetchMock.mockImplementation(hangingFetch())
    const controller = new AbortController()

    const pending = calculate({ operation: 'add', operands: ['1', '2'] }, controller.signal)
    controller.abort()

    expect(await pending).toEqual({ ok: false, code: 'NETWORK_ERROR' })
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
})
