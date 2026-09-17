import { useEffect, useState } from 'react'
import type { Theme } from '../store/uiSlice'

const getStoredTheme = (): Theme => {
  const storedTheme = localStorage.getItem('theme')
  return storedTheme === 'dark' ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))
  }

  return { theme, setTheme, toggleTheme }
}