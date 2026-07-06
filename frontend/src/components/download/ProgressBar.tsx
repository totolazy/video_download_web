import { useDownloadProgress } from "@/hooks/useDownload"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Download, RotateCw, AlertCircle } from "lucide-react"

interface ProgressBarProps {
  downloadId: number | null
  onReset?: () => void
  onRetry?: () => void
}

export default function ProgressBar({ downloadId, onReset, onRetry }: ProgressBarProps) {
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
        className={isCompleted ? "[&>div]:bg-primary" : isFailed ? "[&>div]:bg-destructive" : ""}
      />
      {isCompleted && (
        <Button
          className="w-full"
          onClick={() => window.open("/api/downloads/" + downloadId + "/file?token=" + encodeURIComponent(localStorage.getItem("token") || ""))}
        >
          <Download className="h-4 w-4 mr-2" />
          下载到本地
        </Button>
      )}
      {isFailed && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMessage || "下载失败"}
          </div>
          {onRetry && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCw className="h-4 w-4 mr-2" />
                重试
              </Button>
              {onReset && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  重新开始
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
