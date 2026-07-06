import { useState } from "react"
import { Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar"
import ChangePasswordDialog from "./ChangePasswordDialog"
import { Key, LogOut, User } from "lucide-react"

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: collapsed ? "4rem" : "16rem" }}
      >
        {/* Top header bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 bg-card px-6" style={{ boxShadow: "0 1px 8px rgba(74,55,33,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{user?.username}</span>
            </span>
            <span className="h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPwdOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent h-8 rounded-lg"
            >
              <Key className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">改密</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">退出</span>
            </Button>
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