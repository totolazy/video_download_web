import { PLATFORMS } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PlatformSelectProps {
  detected: string
  platforms: string[]
  value: string
  onChange: (value: string) => void
}

export default function PlatformSelect({ platforms, value, onChange }: PlatformSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">平台</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="选择平台" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((p) => (
            <SelectItem key={p} value={p}>
              {PLATFORMS[p] || p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
