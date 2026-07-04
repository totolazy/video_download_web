import client from "./client"

export async function listUsers() {
  const res = await client.get("/admin/users")
  return res.data
}

export async function createUser(username: string, password: string, note?: string) {
  const res = await client.post("/admin/users", { username, password, note: note || "" })
  return res.data
}

export async function toggleUserActive(id: number) {
  const res = await client.delete(`/admin/users/${id}`)
  return res.data
}

export async function permanentDeleteUser(id: number) {
  const res = await client.delete(`/admin/users/${id}/permanent`)
  return res.data
}

export async function resetPassword(id: number, newPassword: string, oldPassword?: string) {
  const res = await client.post(`/admin/users/${id}/change-password`, {
    new_password: newPassword,
    old_password: oldPassword || undefined,
  })
  return res.data
}