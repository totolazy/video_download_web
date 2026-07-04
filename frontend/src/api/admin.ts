import client from "./client"

export async function listUsers() {
  const res = await client.get("/admin/users")
  return res.data
}

export async function createUser(username: string, password: string, note?: string) {
  const res = await client.post("/admin/users", { username, password, note })
  return res.data
}

export async function deleteUser(id: number) {
  const res = await client.delete(`/admin/users/${id}`)
  return res.data
}
