import { useState, useRef, useEffect } from "react"
import { Outlet, NavLink } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import Sidebar from "./Sidebar"
import ChangePasswordDialog from "./ChangePasswordDialog"
import { Settings, User, Download, Clock, Cookie, Shield } from "lucide-react"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, logout, isRoot } = useAuth()

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
        className={`flex-1 transition-all duration-300 ease-in-out ${collapsed ? "md:ml-16" : "md:ml-64"}`}
      >
        <div className="sticky top-0 z-30 flex h-14 items-center justify-end bg-card px-6" style={{ boxShadow: "0 1px 8px rgba(74,55,33,0.05)" }}>
          <div className="flex-1 flex items-center md:hidden">
            <img src="/logo-white.png" alt="ReelBox" className="h-6 w-6 rounded-lg object-cover" />
            <span className="ml-2 text-base font-bold text-foreground">ReelBox</span>
          </div>
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
                    className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-lg mx-1"
                  >
                    修改密码
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="flex w-full items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-lg mx-1"
                  >
                    退出登录
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

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card pb-safe md:hidden" style={{ boxShadow: "0 -1px 8px rgba(74,55,33,0.06)" }}>
        <MobileTab to="/" end icon={Download} label="下载" />
        <MobileTab to="/history" icon={Clock} label="历史" />
        <MobileTab to="/cookies" icon={Cookie} label="Cookies" />
        {isRoot && <MobileTab to="/admin" icon={Shield} label="管理" />}
      </nav>
      {/* Bottom safe area spacer for mobile */}
      <div className="h-14 md:hidden" />
    </div>
  )
}

function MobileTab({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  )
}
