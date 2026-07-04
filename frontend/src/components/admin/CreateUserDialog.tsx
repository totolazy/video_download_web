import { useState } from "react"
import { createUser } from "@/api/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface CreateUserDialogProps {
  onCreated: () => void
}

export default function CreateUserDialog({ onCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    try {
      await createUser(username.trim(), password, note.trim() || "")
      toast.success("用户创建成功")
      setOpen(false)
      setUsername("")
      setPassword("")
      setNote("")
      onCreated()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "创建失败，请检查输入"
      toast.error(msg as string)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          创建用户
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建用户</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input placeholder="输入用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input type="password" placeholder="输入密码（至少6位）" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>备注（可选）</Label>
            <Input placeholder="备注信息" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={loading || !username.trim() || !password.trim()}>
            {loading ? "创建中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
