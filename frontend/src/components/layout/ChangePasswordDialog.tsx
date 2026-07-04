import { useState } from "react"
import client from "@/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Key } from "lucide-react"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = async () => {
    if (!oldPassword || !newPassword) return
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位")
      return
    }
    setLoading(true)
    try {
      await client.post("/auth/change-password", { old_password: oldPassword, new_password: newPassword })
      toast.success("密码修改成功")
      onOpenChange(false)
      setOldPassword("")
      setNewPassword("")
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "修改失败"
      toast.error(msg as string)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>原密码</Label>
            <Input type="password" placeholder="输入原密码" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input type="password" placeholder="输入新密码（至少6位）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleChange} disabled={loading || !oldPassword || !newPassword}>
            {loading ? "修改中..." : "确认修改"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
