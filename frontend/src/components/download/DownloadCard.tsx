import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSubmitDownload } from "@/hooks/useDownload"
import { useCookies } from "@/hooks/useCookies"
import { getResolutions } from "@/api/videos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UrlInput from "./UrlInput"
import PlatformSelect from "./PlatformSelect"
import ResolutionSelect from "./ResolutionSelect"
import CookiesStatus from "./CookiesStatus"
import ProgressBar from "./ProgressBar"
import { Download, Loader2 } from "lucide-react"

type Phase = "idle" | "ready" | "downloading" | "complete" | "failed"

export default function DownloadCard() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [url, setUrl] = useState("")
  const [detected, setDetected] = useState("")
  const [platforms, setPlatforms] = useState<string[]>([])
  const [platform, setPlatform] = useState("")
  const [resolution, setResolution] = useState("default")
  const [downloadId, setDownloadId] = useState<number | null>(null)

  const submitMutation = useSubmitDownload()
  const { cookiesStatus, refetch: refetchCookies } = useCookies()

  const hasCookies = cookiesStatus?.cookies?.[platform]?.exists ?? false

  // Fetch resolutions when url + platform + cookies are confirmed
  const resolutionsQuery = useQuery({
    queryKey: ["resolutions", platform, url],
    queryFn: () => getResolutions(platform, url),
    enabled: !!url && !!platform && hasCookies,
    staleTime: 30_000,
  })

  const resolutions = resolutionsQuery.data?.resolutions ?? []
  const resolutionsReady = resolutions.length > 0
  const resolutionsError = resolutionsQuery.isError

  const handleDetected = (newDetected: string, newPlatforms: string[], newUrl: string) => {
    setDetected(newDetected)
    setPlatforms(newPlatforms)
    setPlatform(newDetected)
    setUrl(newUrl)
    refetchCookies()
  }

  const handleCookiesChanged = () => {
    refetchCookies()
  }

  const handleStartDownload = async () => {
    if (!url || !platform) return
    setPhase("downloading")
    try {
      const result = await submitMutation.mutateAsync({
        url,
        platform,
        resolution: resolution === "default" ? undefined : resolution,
      })
      setDownloadId(result.download_id)
    } catch {
      setPhase("ready")
    }
  }

  const handleRetry = async () => {
    if (!downloadId) return
    setPhase("downloading")
    try {
      const result = await submitMutation.mutateAsync({
        url,
        platform,
        resolution: resolution === "default" ? undefined : resolution,
      })
      setDownloadId(result.download_id)
    } catch {
      setPhase("ready")
    }
  }

  const canDownload = !!url && !!platform && hasCookies

  return (
    <Card>
      <CardHeader>
        <CardTitle>下载视频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "downloading" && downloadId ? (
          <ProgressBar
            downloadId={downloadId}
            onRetry={handleRetry}
          />
        ) : (
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

                <CookiesStatus
                  platform={platform}
                  onUploaded={handleCookiesChanged}
                />

                {/* Show resolutions once cookies are uploaded */}
                {hasCookies && (
                  <>
                    {resolutionsQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在获取可用分辨率...
                      </div>
                    )}

                    {resolutionsError && (
                      <div className="text-sm text-red-500">
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

