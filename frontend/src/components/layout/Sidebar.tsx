 import { NavLink } from "react-router-dom"
 import { useAuth } from "@/hooks/useAuth"
 import { Download, Clock, Cookie, Shield, LogOut, Key, ChevronLeft, ChevronRight } from "lucide-react"
 import { Button } from "@/components/ui/button"
 import { Separator } from "@/components/ui/separator"
 import ChangePasswordDialog from "./ChangePasswordDialog"
 import { useState } from "react"
 
 const navItems = [
   { to: "/", label: "下载视频", icon: Download },
   { to: "/history", label: "下载历史", icon: Clock },
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
           <img src="/logo-white.png" alt="ReelBox" className="h-8 w-8 shrink-0 rounded-xl object-cover" />
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
             title={collapsed ? "用户管理" : undefined}
           >
             <Shield className="h-4 w-4 shrink-0" />
             <span
               className="whitespace-nowrap transition-opacity duration-200"
               style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto", overflow: "hidden" }}
             >
               用户管理
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
           <Button variant="ghost" size="icon" onClick={() => setPwdOpen(true)} title="修改密码">
             <Key className="h-4 w-4" />
           </Button>
           <Button variant="ghost" size="icon" onClick={logout} title="退出登录">
             <LogOut className="h-4 w-4" />
           </Button>
         </div>
       </div>
       <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
 
       <div className="border-t">
         <button
           onClick={onToggle}
           className="flex w-full items-center justify-center py-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
           title={collapsed ? "展开菜单" : "收纳菜单"}
         >
           {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
         </button>
       </div>
     </aside>
   )
 }
