export type User = {
  id: string
  email: string
  name?: string
}

export type Entity = {
  text: string
  label: 'PERSON' | 'ORG' | 'LOC' | string
  start: number
  end: number
}

export type EntityMapping = Entity & {
  englishText?: string
  englishStart?: number
  englishEnd?: number
  englishTokenIndices?: number[]
  hindiTokenIndices?: number[]
}

export type Token = {
  index: number
  text: string
  start: number
  end: number
}

export type AlignmentPair = {
  hi: number
  en: number
}

export type Article = {
  _id?: string
  id?: string
  userId?: string
  text: string
  entities: Entity[]
  language?: 'en' | 'hi' | string
  translatedText?: string
  entitiesEnglish?: Entity[]
  entityMappings?: EntityMapping[]
  analysis?: {
    tokensHi: Token[]
    tokensEn: Token[]
    alignments: AlignmentPair[]
  }
  createdAt?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include'
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = (isJson ? await res.json().catch(() => null) : null) as any

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`
    const err = new Error(message) as any
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

export const api = {
  signup: (payload: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  requestLoginCode: (payload: { email: string; password: string }) =>
    request<{ ok: boolean }>('/auth/request-code', { method: 'POST', body: JSON.stringify(payload) }),

  verifyLoginCode: (payload: { email: string; code: string }) =>
    request<{ user: User }>('/auth/verify-code', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/auth/me'),

  analyze: (payload: { text: string }) =>
    request<{ article: Article & { id: string } }>('/ner/analyze', { method: 'POST', body: JSON.stringify(payload) }),

  history: (q = '') => {
    const qp = q ? `?q=${encodeURIComponent(q)}` : ''
    return request<{ items: Article[] }>(`/user/history${qp}`)
  },

  deleteHistory: (id: string) => request<{ ok: boolean }>(`/history/${id}`, { method: 'DELETE' })
}
