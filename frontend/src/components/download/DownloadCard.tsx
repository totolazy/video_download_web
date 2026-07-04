import { useState } from "react"
import { useSubmitDownload, useRetryDownload } from "@/hooks/useDownload"
import { useCookies } from "@/hooks/useCookies"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import UrlInput from "./UrlInput"
import PlatformSelect from "./PlatformSelect"
import ResolutionSelect from "./ResolutionSelect"
import CookiesStatus from "./CookiesStatus"
import ProgressBar from "./ProgressBar"
import { Download, Loader2 } from "lucide-react"

type Phase = "idle" | "ready" | "downloading"

export default function DownloadCard() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [url, setUrl] = useState("")
  const [detected, setDetected] = useState("")
  const [platforms, setPlatforms] = useState<string[]>([])
  const [platform, setPlatform] = useState("")
  const [resolution, setResolution] = useState("default")
  const [downloadId, setDownloadId] = useState<number | null>(null)

  const submitMutation = useSubmitDownload()
  const retryMutation = useRetryDownload()
  const { cookiesStatus } = useCookies()

  const hasCookies = cookiesStatus?.cookies?.[platform]?.exists ?? false

  const handleDetected = (detectedPlatform: string, detectedPlatforms: string[]) => {
    setDetected(detectedPlatform)
    setPlatforms(detectedPlatforms)
    setPlatform(detectedPlatform)
    setUrl((prev) => prev) // keep url
    setPhase(hasCookies ? "ready" : "idle")
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
      const result = await retryMutation.mutateAsync(downloadId)
      setDownloadId(result.download_id)
    } catch {
      setPhase("ready")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>下载视频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "downloading" && downloadId ? (
          <ProgressBar downloadId={downloadId} onRetry={handleRetry} />
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
                    setPhase(hasCookies ? "ready" : "idle")
                  }}
                />
                <CookiesStatus platform={platform} />
                {url && platform && (
                  <ResolutionSelect
                    platform={platform}
                    url={url}
                    value={resolution}
                    onChange={setResolution}
                  />
                )}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!url || !platform || !hasCookies || submitMutation.isPending}
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
      </CardContent>
    </Card>
  )
}
