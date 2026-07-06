import { useState, useRef, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "./Sidebar"
import ChangePasswordDialog from "./ChangePasswordDialog"
import { Settings, User } from "lucide-react"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: collapsed ? "4rem" : "16rem" }}
      >
        <div className="sticky top-0 z-30 flex h-14 items-center justify-end bg-card px-6" style={{ boxShadow: "0 1px 8px rgba(74,55,33,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{user?.username}</span>
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
              >
                <Settings className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border-0 bg-card py-1 shadow-lg z-50">
                  <button
                    onClick={() => { setMenuOpen(false); setPwdOpen(true) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-lg mx-1"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    修改密码
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-lg mx-1"
                  >
                    <span className="ml-[22px]">退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </div>
  )
}