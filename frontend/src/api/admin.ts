import client from "./client"

export async function listUsers() {
  const res = await client.get("/admin/users")
  return res.data
}

export async function createUser(username: string, password: string, note?: string) {
  const res = await client.post("/admin/users", { username, password, note: note || "" })
  return res.data
}

export async function deleteUser(id: number) {
  const res = await client.delete(`/admin/users/${id}`)
  return res.data
}

export async function resetPassword(id: number, newPassword: string) {
  const res = await client.post(`/admin/users/${id}/change-password`, { new_password: newPassword })
  return res.data
}
