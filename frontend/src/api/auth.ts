import client from "./client"

export async function login(username: string, password: string) {
  const res = await client.post("/auth/login", { username, password })
  return res.data
}

export async function getMe() {
  const res = await client.get("/auth/me")
  return res.data
}
