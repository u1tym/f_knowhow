export interface MajorCategory {
  id: number
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface MiddleCategory {
  id: number
  major_category_id: number
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

export interface KnowhowListItem {
  id: number
  title: string
  keywords: string | null
  display_order: number
  middle_category_id: number | null
  created_at: string
  updated_at: string
}

export interface KnowhowDetail extends KnowhowListItem {
  content: string
}
