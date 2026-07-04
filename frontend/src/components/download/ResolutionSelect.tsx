import { useQuery } from "@tanstack/react-query"
import { getResolutions } from "@/api/videos"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface ResolutionSelectProps {
  platform: string
  url: string
  value: string
  onChange: (value: string) => void
}

export default function ResolutionSelect({ platform, url, value, onChange }: ResolutionSelectProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["resolutions", platform, url],
    queryFn: () => getResolutions(platform, url),
    enabled: !!platform && !!url,
    staleTime: 60_000,
  })

  const options = data?.resolutions ?? []

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">分辨率</label>
      <Select value={value} onValueChange={onChange} disabled={!platform || !url}>
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              获取中...
            </div>
          ) : (
            <SelectValue placeholder={options.length === 0 ? "默认" : "选择分辨率"} />
          )}
        </SelectTrigger>
        <SelectContent>
          {isError || options.length === 0 ? (
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
