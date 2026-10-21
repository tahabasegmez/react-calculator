import type { ApiErrorCode, CalculationRequest, CalculationResult } from './types'

const TIMEOUT_MS = 5000
const networkError: CalculationResult = { ok: false, code: 'NETWORK_ERROR' }

/** Sends one operation to the backend. Never throws: failures become an error code. */
export async function calculate(
  request: CalculationRequest,
  signal?: AbortSignal,
): Promise<CalculationResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort)

  try {
    const response = await fetch('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
    if (response.status >= 500) {
      return networkError
    }
    const body: unknown = await response.json()
    if (response.ok && hasResult(body)) {
      return { ok: true, result: body.result }
    }
    if (!response.ok && hasErrorCode(body)) {
      return { ok: false, code: body.error.code }
    }
    return networkError
  } catch {
    return networkError
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

function hasResult(body: unknown): body is { result: string } {
  return typeof (body as { result?: unknown } | null)?.result === 'string'
}

function hasErrorCode(body: unknown): body is { error: { code: ApiErrorCode } } {
  return typeof (body as { error?: { code?: unknown } } | null)?.error?.code === 'string'
}
