import axios from 'axios'

export function api(token) {
  const instance = axios.create({
    baseURL: '/api',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  return instance
}
