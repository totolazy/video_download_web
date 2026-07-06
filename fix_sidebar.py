# -*- coding: utf-8 -*-
path = r"E:\Workspace\��Ƶ������վ\frontend\src\components\layout\Sidebar.tsx"

content = """import { NavLink } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Download, Clock, Cookie, Shield, LogOut, Key, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import ChangePasswordDialog from "./ChangePasswordDialog"
import { useState } from "react"

const navItems = [
  { to: "/", label: "\u4e0b\u8f7d\u89c6\u9891", icon: Download },
  { to: "/history", label: "\u4e0b\u8f7d\u5386\u53f2", icon: Clock },
  { to: "/cookies", label: "Cookies", icon: Cookie },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isRoot, logout } = useAuth()
  const [pwdOpen, setPwdOpen] = useState(false)

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-xl transition-all duration-200 ${
      collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
    } text-sm font-medium ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col border-r bg-card transition-all duration-300 z-40"
      style={{ width: collapsed ? "4rem" : "16rem" }}
    >
      <div className="flex h-14 items-center gap-3 overflow-hidden" style={{ paddingLeft: collapsed ? "1rem" : "1.5rem", paddingRight: collapsed ? "1rem" : "1.5rem" }}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Download className="h-4 w-4 text-primary-foreground" />
        </div>
        <span
          className="text-lg font-bold text-foreground whitespace-nowrap transition-opacity duration-200"
          style={{ opacity: collapsed ? 0 : 1 }}
        >
          ReelBox
        </span>
      </div>
      <Separator />

      <nav className="flex-1 space-y-1 overflow-hidden" style={{ padding: collapsed ? "0.5rem" : "0.75rem" }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span
              className="whitespace-nowrap transition-opacity duration-200"
              style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto", overflow: "hidden" }}
            >
              {label}
            </span>
          </NavLink>
        ))}
        {isRoot && (
          <NavLink
            to="/admin"
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? "\u7528\u6237\u7ba1\u7406" : undefined}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span
              className="whitespace-nowrap transition-opacity duration-200"
              style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto", overflow: "hidden" }}
            >
              \u7528\u6237\u7ba1\u7406
            </span>
          </NavLink>
        )}
      </nav>
      <Separator />

      <div className="flex items-center justify-between overflow-hidden" style={{ padding: collapsed ? "0.5rem" : "0.75rem" }}>
        <span
          className="text-sm text-muted-foreground truncate whitespace-nowrap transition-opacity duration-200"
          style={{ opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : "120px" }}
        >
          {user?.username}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPwdOpen(true)} title="\u4fee\u6539\u5bc6\u7801">
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} title="\u9000\u51fa\u767b\u5f55">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />

      <div className="border-t">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={collapsed ? "\u5c55\u5f00\u83dc\u5355" : "\u6536\u7eb3\u83dc\u5355"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
"""

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("done")
