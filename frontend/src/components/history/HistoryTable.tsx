import { PLATFORMS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, RotateCw } from "lucide-react"

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-600",
  completed: "bg-green-100 text-green-600",
  failed: "bg-red-100 text-red-600",
}

const statusLabels: Record<string, string> = {
  pending: "等待中",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
}

interface HistoryRowProps {
  download: {
    id: number
    url: string
    platform: string
    resolution?: string
    status: string
    progress: number
    file_name?: string
    created_at: string
  }
  onRetry?: (id: number) => void
}

export function HistoryRow({ download, onRetry }: HistoryRowProps) {
  const platformLabel = PLATFORMS[download.platform] || download.platform
  const truncatedUrl = download.url.length > 50 ? download.url.slice(0, 50) + "..." : download.url

  return (
    <TableRow>
      <TableCell>{platformLabel}</TableCell>
      <TableCell className="max-w-[300px] truncate" title={download.url}>
        {truncatedUrl}
      </TableCell>
      <TableCell>{download.resolution || "-"}</TableCell>
      <TableCell>
        <Badge variant="outline" className={statusColors[download.status] || ""}>
          {statusLabels[download.status] || download.status}
        </Badge>
      </TableCell>
      <TableCell>
        {download.progress > 0 && download.progress < 100 ? `${download.progress}%` : "-"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(download.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {download.status === "completed" && (
            <Button variant="ghost" size="icon" title="下载到本地"
              onClick={() => window.open(`/api/downloads/${download.id}/file`)}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          {download.status === "failed" && onRetry && (
            <Button variant="ghost" size="icon" title="重试" onClick={() => onRetry(download.id)}>
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

interface HistoryTableProps {
  downloads: Array<HistoryRowProps["download"]>
  onRetry: (id: number) => void
}

export function HistoryTable({ downloads, onRetry }: HistoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>平台</TableHead>
          <TableHead>链接</TableHead>
          <TableHead>分辨率</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>进度</TableHead>
          <TableHead>时间</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {downloads.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              暂无下载记录
            </TableCell>
          </TableRow>
        ) : (
          downloads.map((d) => <HistoryRow key={d.id} download={d} onRetry={onRetry} />)
        )}
      </TableBody>
    </Table>
  )
}
