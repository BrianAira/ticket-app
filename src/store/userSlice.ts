import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../types/api'

interface UserState {
  selectedUser: User | null
}

const initialState: UserState = {
  selectedUser: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedUser: (state, action: PayloadAction<User>) => {
      state.selectedUser = action.payload
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null
    },
  },
})

export const { setSelectedUser, clearSelectedUser } = userSlice.actions
export default userSlice.reducer

