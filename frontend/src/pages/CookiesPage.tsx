import { PLATFORMS, SUPPORTED_PLATFORMS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CookiesStatus from "@/components/download/CookiesStatus"

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Cookies 管理</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTED_PLATFORMS.map((platform) => (
          <Card key={platform} className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{PLATFORMS[platform]}</CardTitle>
            </CardHeader>
            <CardContent>
              <CookiesStatus platform={platform} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
