import { useQuery } from "@tanstack/react-query"
import { listUsers, deleteUser } from "@/api/admin"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Ban, Loader2 } from "lucide-react"

interface UserTableProps {
  refreshKey: number
}

export default function UserTable({ refreshKey }: UserTableProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminUsers", refreshKey],
    queryFn: () => listUsers(),
  })

  const users = data?.users ?? []

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id)
      refetch()
    } catch {
      // handle silently
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>用户名</TableHead>
          <TableHead>备注</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>角色</TableHead>
          <TableHead>创建时间</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              暂无用户
            </TableCell>
          </TableRow>
        ) : (
          users.map((u: {
            id: number
            username: string
            note?: string
            is_active: boolean
            is_root: boolean
            created_at: string
          }) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.username}</TableCell>
              <TableCell className="text-muted-foreground">{u.note || "-"}</TableCell>
              <TableCell>
                <Badge variant={u.is_active ? "outline" : "destructive"}>
                  {u.is_active ? "正常" : "已禁用"}
                </Badge>
              </TableCell>
              <TableCell>
                {u.is_root ? (
                  <Badge variant="secondary">管理员</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">普通用户</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(u.created_at)}
              </TableCell>
              <TableCell>
                {u.is_root ? (
                  <span className="text-xs text-muted-foreground">不可操作</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(u.id)}
                    disabled={!u.is_active}
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    禁用
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
