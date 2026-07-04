import { useDownloadProgress } from "@/hooks/useDownload"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Download, RotateCw, AlertCircle } from "lucide-react"

interface ProgressBarProps {
  downloadId: number | null
  onRetry?: () => void
}

export default function ProgressBar({ downloadId, onRetry }: ProgressBarProps) {
  const { progress, status, fileName, errorMessage } = useDownloadProgress(downloadId)

  if (!downloadId) return null

  const isCompleted = status === "completed"
  const isFailed = status === "failed"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {isCompleted ? "下载完成" : isFailed ? "下载失败" : `下载中 ${progress}%`}
        </span>
        {fileName && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
      </div>
      <Progress
        value={progress}
        className={isCompleted ? "[&>div]:bg-green-500" : isFailed ? "[&>div]:bg-red-500" : ""}
      />
      {isCompleted && (
        <Button
          className="w-full"
          onClick={() => window.open(`/api/downloads/${downloadId}/file`)}
        >
          <Download className="h-4 w-4 mr-2" />
          下载到本地
        </Button>
      )}
      {isFailed && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {errorMessage || "下载失败"}
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
