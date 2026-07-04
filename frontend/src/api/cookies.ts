import client from "./client"

export interface CookieStatus {
  exists: boolean
  uploaded_at: string | null
}

export interface CookiesStatusResponse {
  cookies: Record<string, CookieStatus>
}

export async function getCookiesStatus(): Promise<CookiesStatusResponse> {
  const res = await client.get("/cookies/status")
  return res.data
}

export async function uploadCookie(platform: string, file: File) {
  const formData = new FormData()
  formData.append("platform", platform)
  formData.append("file", file)
  const res = await client.post("/cookies/upload", formData)
  return res.data
}

export async function removeCookie(platform: string) {
  const res = await client.delete(`/cookies/${platform}`)
  return res.data
}
