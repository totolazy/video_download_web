import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { ResolutionOption } from "@/api/videos"

interface ResolutionSelectProps {
  platform: string
  url: string
  resolutions: ResolutionOption[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
}

export default function ResolutionSelect({
  platform, _url, resolutions, value, onChange, loading,
}: ResolutionSelectProps) {
  const options = resolutions
  const hasResolutions = options.length > 0

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">分辨率</label>
      <Select value={value} onValueChange={onChange} disabled={!platform || loading}>
        <SelectTrigger>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              获取中...
            </div>
          ) : (
            <SelectValue placeholder={hasResolutions ? "选择分辨率" : "默认"} />
          )}
        </SelectTrigger>
        <SelectContent>
          {!hasResolutions ? (
            <SelectItem value="default">默认</SelectItem>
          ) : (
            options.map((opt) => (
              <SelectItem key={opt.format_id} value={opt.format_id}>
                {opt.description}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
