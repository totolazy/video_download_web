import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { listDownloads, submitDownload, retryDownload } from "@/api/downloads"

export interface DownloadProgress {
  progress: number
  status: string
  fileName: string | null
  fileSize: number | null
  errorMessage: string | null
}

export function useDownloadHistory(page: number) {
  return useQuery({
    queryKey: ["downloads", page],
    queryFn: () => listDownloads(page),
  })
}

export function useSubmitDownload() {
  return useMutation({ mutationFn: ({ url, platform, resolution }: { url: string; platform: string; resolution?: string }) => submitDownload(url, platform, resolution) })
}

export function useRetryDownload() {
  return useMutation({ mutationFn: (id: number) => retryDownload(id) })
}

export function useDownloadProgress(downloadId: number | null) {
  const [state, setState] = useState<DownloadProgress>({
    progress: 0,
    status: "pending",
    fileName: null,
    fileSize: null,
    errorMessage: null,
  })

  useEffect(() => {
    if (!downloadId) return

    const es = new EventSource(`/api/downloads/${downloadId}/progress`)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setState({
        progress: data.progress ?? 0,
        status: data.status ?? "pending",
        fileName: data.file_name ?? null,
        fileSize: data.file_size ?? null,
        errorMessage: data.error_message ?? null,
      })
      if (data.status === "completed" || data.status === "failed") {
        es.close()
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => es.close()
  }, [downloadId])

  return state
}
