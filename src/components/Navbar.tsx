import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useUsers } from '../hooks/useApi'
import { useTheme } from '../hooks/useTheme'
import type { RootState, AppDispatch } from '../store'
import { setSelectedUser } from '../store/userSlice'
import { setTheme } from '../store/uiSlice'

export function Navbar() {
  const dispatch = useDispatch<AppDispatch>()
  const { selectedUser } = useSelector((state: RootState) => state.user)
  const { theme, toggleTheme } = useTheme()
  const usersQuery = useUsers()

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-6 py-4">
      <Link className="text-lg font-semibold tracking-tight text-slate-950 no-underline dark:text-white" to="/">
        Ticket<span className="text-slate-500 dark:text-slate-400">App</span>
      </Link>
      <nav aria-label="Navegación principal" className="flex items-center gap-5">
        <Link className="text-sm font-medium text-slate-600 no-underline transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white" to="/eventos">Eventos</Link>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Sesión</span>
          <select
            aria-label="Seleccionar usuario activo"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800"
            value={selectedUser?.id ?? ''}
            onChange={(event) => {
              const user = usersQuery.data?.find(
                (candidate) => candidate.id === event.target.value,
              )
              if (user) {
                dispatch(setSelectedUser(user))
              }
            }}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {usersQuery.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          type="button"
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : 'light'
            toggleTheme()
            dispatch(setTheme(nextTheme))
          }}
        >
          {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>
      </div>
      </div>
    </header>
  )
}
