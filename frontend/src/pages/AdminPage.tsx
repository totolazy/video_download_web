import { useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import UserTable from "@/components/admin/UserTable"
import CreateUserDialog from "@/components/admin/CreateUserDialog"

export default function AdminPage() {
  const { isRoot } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  if (!isRoot) return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <CreateUserDialog onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <UserTable refreshKey={refreshKey} />
    </div>
  )
}
