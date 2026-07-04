import { useState } from "react"
import { detect } from "@/api/videos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"

interface UrlInputProps {
  onDetected: (detected: string, platforms: string[]) => void
}

export default function UrlInput({ onDetected }: UrlInputProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDetect = async () => {
    if (!url.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await detect(url.trim())
      onDetected(result.detected, result.platforms)
    } catch {
      setError("URL 检测失败，请检查链接是否正确")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleDetect()
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">视频链接</label>
      <div className="flex gap-2">
        <Input
          placeholder="粘贴视频链接，如 https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleDetect} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          检测
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
