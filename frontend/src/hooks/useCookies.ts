import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCookiesStatus, uploadCookie, removeCookie } from "@/api/cookies"

export function useCookies() {
  const queryClient = useQueryClient()

  const cookiesStatus = useQuery({
    queryKey: ["cookiesStatus", localStorage.getItem("token")],
    queryFn: getCookiesStatus,
    staleTime: 0,
  })

  const uploadCookieMutation = useMutation({
    mutationFn: ({ platform, file }: { platform: string; file: File }) =>
      uploadCookie(platform, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cookiesStatus", localStorage.getItem("token")] }),
  })

  const deleteCookieMutation = useMutation({
    mutationFn: (platform: string) => removeCookie(platform),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cookiesStatus", localStorage.getItem("token")] }),
  })

  return {
    cookiesStatus: cookiesStatus.data,
    isLoading: cookiesStatus.isLoading,
    uploadCookie: uploadCookieMutation.mutateAsync,
    deleteCookie: deleteCookieMutation.mutateAsync,
  }
}
