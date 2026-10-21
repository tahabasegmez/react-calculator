import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { calculate } from '../../../api/client'
import { calculatorReducer, initialState, planRequest } from '../state/reducer'
import type { Key } from '../state/types'

const LOADING_INDICATOR_DELAY_MS = 300

export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const [showLoading, setShowLoading] = useState(false)
  // Set synchronously, so a second key press before the next render is ignored too.
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => () => inFlight.current?.abort(), [])

  const press = useCallback(
    async (key: Key) => {
      if (inFlight.current) {
        return
      }
      const request = planRequest(state, key)
      if (request === null) {
        dispatch({ type: 'KEY_PRESSED', key })
        return
      }

      const controller = new AbortController()
      inFlight.current = controller
      dispatch({ type: 'CALCULATION_STARTED' })
      const timer = setTimeout(() => setShowLoading(true), LOADING_INDICATOR_DELAY_MS)

      const response = await calculate(request, controller.signal)

      clearTimeout(timer)
      if (controller.signal.aborted) {
        return
      }
      inFlight.current = null
      setShowLoading(false)
      dispatch(
        response.ok
          ? { type: 'CALCULATION_SUCCEEDED', key, result: response.result }
          : { type: 'CALCULATION_FAILED', code: response.code },
      )
    },
    [state],
  )

  return { state, press, showLoading }
}
