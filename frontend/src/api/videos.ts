import client from "./client"

export interface DetectResponse {
  detected: string
  platforms: string[]
}

export interface ResolutionOption {
  format_id: string
  description: string
}

export interface ResolutionsResponse {
  resolutions: ResolutionOption[]
}

export async function detect(url: string): Promise<DetectResponse> {
  const res = await client.post("/videos/detect", { url })
  return res.data
}

export async function getResolutions(platform: string, url: string): Promise<ResolutionsResponse> {
  const res = await client.get("/videos/resolutions", { params: { platform, url } })
  return res.data
}
