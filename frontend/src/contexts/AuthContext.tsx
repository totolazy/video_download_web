import { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import client from "@/api/client"

export interface UserInfo {
  id: number
  username: string
  is_root: boolean
  note?: string
  created_at?: string
}

interface AuthState {
  user: UserInfo | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isRoot: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"))
  const [loading, setLoading] = useState(true)

  const devMode = useMemo(() => import.meta.env.VITE_DEV_MODE === "true", [])

  const devUser: UserInfo = useMemo(() => ({
    id: 1,
    username: "dev",
    is_root: true,
    note: "开发模式",
  }), [])

  useEffect(() => {
    if (devMode) {
      setUser(devUser)
      setLoading(false)
      return
    }
    if (!token) {
      setLoading(false)
      return
    }
    client.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token")
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token, devMode, devUser])

  const login = useCallback(async (username: string, password: string) => {
    const res = await client.post("/auth/login", { username, password })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }, [])

  const isRoot = devMode ? true : (user?.is_root ?? false)

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isRoot }}>
      {children}
    </AuthContext.Provider>
  )
}
