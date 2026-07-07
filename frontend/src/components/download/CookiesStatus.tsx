import { useRef } from "react"
import { useCookies } from "@/hooks/useCookies"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface CookiesStatusProps {
  platform: string
  onUploaded?: () => void
}

export default function CookiesStatus({ platform, onUploaded }: CookiesStatusProps) {
  const { cookiesStatus, isLoading, uploadCookie } = useCookies()
  const fileRef = useRef<HTMLInputElement>(null)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        检查中...
      </div>
    )
  }

  const status = cookiesStatus?.cookies?.[platform]

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && platform) {
      try {
        await uploadCookie({ platform, file })
        onUploaded?.()
      } catch {
        // error handled by mutation
      }
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="flex items-center gap-2 max-md:flex-wrap">
      {status?.exists ? (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="border-green-500 text-green-600">
            {formatDate(status.uploaded_at) ? `已上传 (${formatDate(status.uploaded_at)})` : "已上传"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" />
            重新上传
          </Button>
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 text-red-500" />
          <Badge variant="destructive">未上传</Badge>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" />
            上传 Cookies
          </Button>
        </>
      )}
      <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleUpload} />
    </div>
  )
}
