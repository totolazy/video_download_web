import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSubmitDownload, useDownloadProgress, useActiveDownloadId } from "@/hooks/useDownload"
import { useCookies } from "@/hooks/useCookies"
import { getResolutions } from "@/api/videos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UrlInput from "./UrlInput"
import PlatformSelect from "./PlatformSelect"
import ResolutionSelect from "./ResolutionSelect"
import CookiesStatus from "./CookiesStatus"
import ProgressBar from "./ProgressBar"
import { Download, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react"

type Phase = "idle" | "ready" | "downloading" | "completed" | "error"

export default function DownloadCard() {
  const [activeId, setActiveId] = useActiveDownloadId()
  const [phase, setPhase] = useState<Phase>(activeId ? "downloading" : "idle")
  const [url, setUrl] = useState("")
  const [detected, setDetected] = useState("")
  const [platforms, setPlatforms] = useState<string[]>([])
  const [platform, setPlatform] = useState("")
  const [resolution, setResolution] = useState("default")
  const [downloadId, setDownloadId] = useState<number | null>(activeId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submitMutation = useSubmitDownload()
  const { cookiesStatus, refetch: refetchCookies } = useCookies()
  const progress = useDownloadProgress(downloadId)

  const hasCookies = cookiesStatus?.cookies?.[platform]?.exists ?? false

  // On mount with active download, restore state
  useEffect(() => {
    if (!activeId) return
    setDownloadId(activeId)
    // Phase will be set by the progress effect below
  }, [activeId])

  // Track download progress -> phase transition
  useEffect(() => {
    if (!downloadId) return
    if (progress.status === "completed") {
      setPhase("completed")
      setErrorMessage(null)
    } else if (progress.status === "failed") {
      setPhase("error")
      setErrorMessage(progress.errorMessage || "下载失败，请稍后重试")
    } else if (progress.status === "processing" || progress.status === "pending") {
      setPhase("downloading")
    }
  }, [progress.status, progress.errorMessage, downloadId])

  const resolutionsQuery = useQuery({
    queryKey: ["resolutions", platform, url],
    queryFn: () => getResolutions(platform, url),
    enabled: !!url && !!platform && hasCookies,
    staleTime: 30_000,
  })

  const resolutions = resolutionsQuery.data?.resolutions ?? []
  const resolutionsError = resolutionsQuery.isError

  const handleDetected = (newDetected: string, newPlatforms: string[], newUrl: string) => {
    setDetected(newDetected)
    setPlatforms(newPlatforms)
    setPlatform(newDetected)
    setUrl(newUrl)
    setPhase(newDetected ? "ready" : "idle")
    refetchCookies()
  }

  const handleCookiesChanged = () => {
    refetchCookies()
  }

  const handleStartDownload = async () => {
    if (!url || !platform) return
    setPhase("downloading")
    setErrorMessage(null)
    try {
      const result = await submitMutation.mutateAsync({
        url,
        platform,
        resolution: resolution === "default" ? undefined : resolution,
      })
      const newId = result.download_id
      setDownloadId(newId)
      setActiveId(newId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "下载提交失败，请检查网络"
      setPhase("error")
      setErrorMessage(msg)
    }
  }

  const handleRetry = async () => {
    if (!url || !platform) return
    setPhase("downloading")
    setErrorMessage(null)
    setDownloadId(null)
    setActiveId(null)
    try {
      const result = await submitMutation.mutateAsync({
        url,
        platform,
        resolution: resolution === "default" ? undefined : resolution,
      })
      const newId = result.download_id
      setDownloadId(newId)
      setActiveId(newId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "下载提交失败"
      setPhase("error")
      setErrorMessage(msg)
    }
  }

  // Reset everything for next download
  const handleNextDownload = () => {
    setPhase("idle")
    setDownloadId(null)
    setActiveId(null)
    setErrorMessage(null)
    setUrl("")
    setDetected("")
    setPlatforms([])
    setPlatform("")
    setResolution("default")
  }

  const canDownload = !!url && !!platform && hasCookies

  return (
    <Card>
      <CardHeader>
        <CardTitle>下载视频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* === COMPLETED === */}
        {phase === "completed" && downloadId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">下载成功</span>
            </div>
            <ProgressBar downloadId={downloadId} />
            <Button
              className="w-full"
              variant="outline"
              onClick={handleNextDownload}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              下载下一个视频
            </Button>
          </div>
        )}

        {/* === DOWNLOADING === */}
        {phase === "downloading" && downloadId && (
          <ProgressBar downloadId={downloadId} onRetry={handleRetry} />
        )}

        {/* === ERROR === */}
        {phase === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">下载失败</p>
                <p className="text-sm text-red-600 mt-1">{errorMessage || "未知错误"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRetry}>重试</Button>
              <Button variant="ghost" onClick={handleNextDownload}>重新开始</Button>
            </div>
          </div>
        )}

        {/* === IDLE / READY === */}
        {(phase === "idle" || phase === "ready") && (
          <>
            <UrlInput onDetected={handleDetected} />

            {platforms.length > 0 && (
              <>
                <PlatformSelect
                  detected={detected}
                  platforms={platforms}
                  value={platform}
                  onChange={(p) => {
                    setPlatform(p)
                    refetchCookies()
                  }}
                />

                <CookiesStatus platform={platform} onUploaded={handleCookiesChanged} />

                {hasCookies && (
                  <>
                    {resolutionsQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在获取可用分辨率...
                      </div>
                    )}

                    {resolutionsError && (
                      <div className="text-sm text-muted-foreground">
                        获取分辨率失败，将使用默认最佳质量
                      </div>
                    )}

                    <ResolutionSelect
                      platform={platform}
                      url={url}
                      resolutions={resolutions}
                      value={resolution}
                      onChange={setResolution}
                      loading={resolutionsQuery.isLoading}
                    />

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!canDownload || submitMutation.isPending}
                      onClick={handleStartDownload}
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Download className="h-5 w-5 mr-2" />
                      )}
                      开始下载
                    </Button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
