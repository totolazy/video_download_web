import { useState } from "react"
import { detect } from "@/api/videos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"

interface UrlInputProps {
  onDetected: (detected: string, platforms: string[], url: string) => void
}

export default function UrlInput({ onDetected }: UrlInputProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const handleDetect = async () => {
    if (!url.trim()) return
    setHint(null)
    setLoading(true)
    try {
      const result = await detect(url.trim())
      if (!result.detected) {
        setHint("请检查平台是否正确")
      } else {
        setHint(null)
      }
      try {
        onDetected(result.detected ?? "", result.platforms, url.trim())
      } catch {
        // onDetected callback may fail (e.g. cookies refetch), but detection itself succeeded
        setHint("")
      }
    } catch {
      // detect() API call failed
      setHint("请检查平台是否正确")
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
      <div className="flex gap-2 max-md:flex-col">
        <Input
          placeholder="粘贴视频链接，如 https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => { setUrl(e.target.value); setHint(null) }}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleDetect} disabled={loading || !url.trim()} className="max-md:w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          检测
        </Button>
      </div>
      {hint && <p className="text-sm text-gray-400">{hint}</p>}
    </div>
  )
}
