import client from "./client"

export async function submitDownload(url: string, platform: string, resolution?: string) {
  const res = await client.post("/downloads", { url, platform, resolution })
  return res.data
}

export async function listDownloads(page = 1, pageSize = 20) {
  const res = await client.get("/downloads", { params: { page, page_size: pageSize } })
  return res.data
}

export async function getDownload(id: number) {
  const res = await client.get(`/downloads/${id}`)
  return res.data
}

export async function retryDownload(id: number) {
  const res = await client.post(`/downloads/${id}/retry`)
  return res.data
}
