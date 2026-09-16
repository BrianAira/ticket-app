import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'light' | 'dark'

interface ErrorModal {
  isOpen: boolean
  message: string | null
}

interface UiState {
  theme: Theme
  errorModal: ErrorModal
}

const initialState: UiState = {
  theme: 'light',
  errorModal: {
    isOpen: false,
    message: null,
  },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
    },
    openErrorModal: (state, action: PayloadAction<string>) => {
      state.errorModal = { isOpen: true, message: action.payload }
    },
    closeErrorModal: (state) => {
      state.errorModal = { isOpen: false, message: null }
    },
  },
})

export const {
  setTheme,
  toggleTheme,
  openErrorModal,
  closeErrorModal,
} = uiSlice.actions
export default uiSlice.reducer

