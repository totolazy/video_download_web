import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listDownloads, submitDownload, retryDownload, getDownload } from "@/api/downloads"

// Module-level active download ID for persistence across navigation
let _activeDownloadId: number | null = null
const listeners = new Set<() => void>()

export function setActiveDownloadId(id: number | null) {
  _activeDownloadId = id
  listeners.forEach(fn => fn())
}

export function getActiveDownloadId(): number | null {
  return _activeDownloadId
}

export function useActiveDownloadId() {
  const [id, setId] = useState<number | null>(_activeDownloadId)
  useEffect(() => {
    const fn = () => setId(_activeDownloadId)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  const set = useCallback((newId: number | null) => setActiveDownloadId(newId), [])
  return [id, set] as const
}

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
    refetchInterval: 3000,
  })
}

export function useSubmitDownload() {
  return useMutation({
    mutationFn: ({ url, platform, resolution }: { url: string; platform: string; resolution?: string }) =>
      submitDownload(url, platform, resolution),
  })
}

export function useRetryDownload() {
  return useMutation({
    mutationFn: (id: number) => retryDownload(id),
  })
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
    if (!downloadId) {
      setState({ progress: 0, status: "pending", fileName: null, fileSize: null, errorMessage: null })
      return
    }

    // Initial fetch to get current state
    getDownload(downloadId).then(data => {
      setState({
        progress: data.progress ?? 0,
        status: data.status ?? "pending",
        fileName: data.file_name ?? null,
        fileSize: data.file_size ?? null,
        errorMessage: data.error_message ?? null,
      })
      if (data.status === "completed" || data.status === "failed") {
        }
    }).catch(() => {})

    // SSE for live updates
    const es = new EventSource("/api/downloads/" + downloadId + "/progress?token=" + encodeURIComponent(localStorage.getItem("token") || ""))

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.error) {
              return
        }
        const newState = {
          progress: data.progress ?? 0,
          status: data.status ?? "pending",
          fileName: data.file_name ?? null,
          fileSize: data.file_size ?? null,
          errorMessage: data.error_message ?? null,
        }
        setState(newState)
        if (data.status === "completed" || data.status === "failed") {
              es.close()
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      es.close()

    }

    return () => es.close()
  }, [downloadId])

  return state
}