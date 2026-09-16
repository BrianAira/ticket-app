import { describe, expect, it } from 'vitest'
import reducer, { setTheme, toggleTheme } from './uiSlice'

describe('uiSlice', () => {
  it('alterna correctamente entre tema claro y oscuro', () => {
    const initialState = reducer(undefined, { type: 'unknown' })
    const darkState = reducer(initialState, toggleTheme())
    const lightState = reducer(darkState, toggleTheme())

    expect(initialState.theme).toBe('light')
    expect(darkState.theme).toBe('dark')
    expect(lightState.theme).toBe('light')
  })

  it('permite establecer explícitamente el tema', () => {
    const state = reducer(undefined, setTheme('dark'))

    expect(state.theme).toBe('dark')
  })
})
