import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listUsers, toggleUserActive, permanentDeleteUser, resetPassword } from "@/api/admin"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Key, Trash2, Lock, Unlock, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function UserTable() {
  const { data, refetch } = useQuery({ queryKey: ["adminUsers"], queryFn: listUsers })
  const [resetUser, setResetUser] = useState<{ id: number; username: string } | null>(null)
  const [newPwd, setNewPwd] = useState("")
  const [oldPwd, setOldPwd] = useState("")
  const [resetting, setResetting] = useState(false)

  const handleToggle = async (id: number, username: string) => {
    try {
      const result = await toggleUserActive(id)
      toast.success((result as { message: string }).message || "ok")
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "failed"
      toast.error(msg as string)
    }
  }

  const handleDelete = async (id: number, username: string) => {
    const msg = "确定永久删除用户 " + username + "？此操作不可恢复。"
    if (!confirm(msg)) return
    try {
      const result = await permanentDeleteUser(id)
      toast.success((result as { message: string }).message || "deleted")
      refetch()
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "failed"
      toast.error(m as string)
    }
  }

  const handleReset = async () => {
    if (!resetUser || !newPwd || newPwd.length < 6) {
      toast.error("新密码至少 6 位")
      return
    }
    setResetting(true)
    try {
      await resetPassword(resetUser.id, newPwd, oldPwd || undefined)
      toast.success("用户 " + resetUser.username + " 密码已重置")
      setResetUser(null)
      setNewPwd("")
      setOldPwd("")
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "failed"
      toast.error(m as string)
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-[240px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.users.map((u: { id: number; username: string; note: string; is_active: boolean; created_at: string | null }) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.username}</TableCell>
              <TableCell className="text-muted-foreground">{u.note || "-"}</TableCell>
              <TableCell>
                <Badge variant={u.is_active ? "default" : "destructive"}>
                  {u.is_active ? "正常" : "已禁用"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{u.created_at ? formatDate(u.created_at) : "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(u.id, u.username)} disabled={u.username === "root"}>
                    {u.is_active ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                    {u.is_active ? "禁用" : "启用"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setResetUser({ id: u.id, username: u.username })}>
                    <Key className="h-3 w-3 mr-1" />
                    重置密码
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id, u.username)} disabled={u.username === "root"}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPwd(""); setOldPwd("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码 - {resetUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resetUser?.username === "root" && (
              <div className="space-y-2">
                <Label>原密码</Label>
                <Input type="password" placeholder="输入 root 原密码" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>新密码（至少 6 位）</Label>
              <Input type="password" placeholder="输入新密码" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoFocus />
            </div>
            <Button className="w-full" onClick={handleReset} disabled={resetting || !newPwd || newPwd.length < 6}>
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              确认重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
