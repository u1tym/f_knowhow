import { knowhowApiBaseUrl } from '../config/knowhow-api.config'
import type {
  KnowhowDetail,
  KnowhowListItem,
  KnowhowSearchResultItem,
  MajorCategory,
  MiddleCategory,
} from './types'

export class KnowhowApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly bodyText?: string,
  ) {
    super(message)
    this.name = 'KnowhowApiError'
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${knowhowApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const text = await res.text()
  if (!res.ok) {
    throw new KnowhowApiError(
      `HTTP ${res.status}: ${res.statusText || 'エラー'}`,
      res.status,
      text || undefined,
    )
  }
  if (init?.method === 'HEAD' || text === '') {
    return undefined as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new KnowhowApiError('レスポンスの JSON が不正です', res.status, text)
  }
}

export async function fetchMajorCategories(): Promise<MajorCategory[]> {
  return requestJson<MajorCategory[]>('/major-categories')
}

export async function createMajorCategory(name: string): Promise<MajorCategory> {
  return requestJson<MajorCategory>('/major-categories', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  })
}

export async function fetchMiddleCategories(majorId: number): Promise<MiddleCategory[]> {
  return requestJson<MiddleCategory[]>(`/major-categories/${majorId}/middle-categories`)
}

export async function createMiddleCategory(
  majorId: number,
  name: string,
): Promise<MiddleCategory> {
  return requestJson<MiddleCategory>(`/major-categories/${majorId}/middle-categories`, {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  })
}

export async function fetchKnowhows(middleId: number): Promise<KnowhowListItem[]> {
  return requestJson<KnowhowListItem[]>(`/middle-categories/${middleId}/knowhows`)
}

export async function fetchKnowhowDetail(id: number): Promise<KnowhowDetail> {
  return requestJson<KnowhowDetail>(`/knowhows/${id}`)
}

export async function searchKnowhowsByKeywords(
  keywords: string[],
): Promise<KnowhowSearchResultItem[]> {
  const normalized = keywords.map((k) => k.trim()).filter(Boolean)
  const qs = new URLSearchParams()
  for (const keyword of normalized) {
    qs.append('keyword', keyword)
  }
  return requestJson<KnowhowSearchResultItem[]>(`/knowhows/search?${qs.toString()}`)
}

export async function createKnowhow(
  payload: {
    title: string
    keywords?: string | null
    content: string
    middle_category_id?: number | null
  },
): Promise<KnowhowDetail> {
  return requestJson<KnowhowDetail>('/knowhows', {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title.trim(),
      keywords: payload.keywords?.trim() || null,
      content: payload.content.trim(),
      middle_category_id: payload.middle_category_id ?? null,
    }),
  })
}

export async function updateKnowhow(
  knowhowId: number,
  payload: {
    title: string
    keywords: string | null
    content: string
    middle_category_id: number | null
  },
): Promise<KnowhowDetail> {
  return requestJson<KnowhowDetail>(`/knowhows/${knowhowId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: payload.title.trim(),
      keywords: payload.keywords?.trim() || null,
      content: payload.content.trim(),
      middle_category_id: payload.middle_category_id,
    }),
  })
}
