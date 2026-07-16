import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Target {
  id: number
  name: string
  origins: string        // JSON string
  destination: string
  one_way: boolean
  date_from: string
  date_to: string
  stay_min: number
  stay_max: number
  cabins: string         // JSON string
  max_stops: number
  passengers: number
  currencies: string     // JSON string
  price_ceiling: number | null
  active: boolean
  created_at: string
}

export interface TargetCreate {
  name: string
  origins: string[]
  destination: string
  one_way?: boolean
  date_from: string
  date_to: string
  stay_min?: number
  stay_max?: number
  cabins?: string[]
  max_stops?: number
  passengers?: number
  currencies?: string[]
  price_ceiling?: number | null
  active?: boolean
}

export interface Opportunity {
  id: number
  observation_id: number
  target_id: number
  origin: string
  destination: string
  price: number
  currency: string
  cabin: string
  airline: string
  departure_at: string
  return_at: string | null
  pct_below_baseline: number
  strength: 'good' | 'great' | 'mistake_fare'
  confirmed_live: boolean
  expiry_status: 'valid' | 'expired' | 'unknown'
  buy_link: string
  detected_at: string
  is_dismissed: boolean
  baseline_price: number | null
}

export interface DashboardStats {
  total_targets: number
  active_opportunities: number
  mistake_fares_today: number
  best_deal: string | null
  best_deal_pct: number | null
}

export interface PriceHistoryPoint {
  date: string
  price: number
  airline: string
  cabin: string
}

export interface Observation {
  id: number
  target_id: number
  origin: string
  destination: string
  price: number
  currency: string
  cabin: string
  airline: string
  stops: number
  departure_at: string
  return_at: string | null
  source: string
  collected_at: string
}

// ─── Targets ──────────────────────────────────────────────────────────────────

export const getTargets = () =>
  api.get<Target[]>('/api/targets').then(r => r.data)

export const createTarget = (data: TargetCreate) =>
  api.post<Target>('/api/targets', data).then(r => r.data)

export const updateTarget = (id: number, data: Partial<TargetCreate>) =>
  api.put<Target>(`/api/targets/${id}`, data).then(r => r.data)

export const deleteTarget = (id: number) =>
  api.delete(`/api/targets/${id}`)

export const toggleTarget = (id: number) =>
  api.patch<Target>(`/api/targets/${id}/toggle`).then(r => r.data)

// ─── Opportunities ────────────────────────────────────────────────────────────

export interface OpportunityFilters {
  strength?: string
  confirmed_live?: boolean
  dismissed?: boolean
}

export const getOpportunities = (filters?: OpportunityFilters) =>
  api.get<Opportunity[]>('/api/opportunities', { params: filters }).then(r => r.data)

export const dismissOpportunity = (id: number) =>
  api.post<Opportunity>(`/api/opportunities/${id}/dismiss`).then(r => r.data)

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStats = () =>
  api.get<DashboardStats>('/api/dashboard/stats').then(r => r.data)

// ─── Observations ─────────────────────────────────────────────────────────────

export const getPriceHistory = (
  origin: string,
  destination: string,
  cabin = 'economy',
  days = 90,
) =>
  api
    .get<PriceHistoryPoint[]>('/api/observations/history', {
      params: { origin, destination, cabin, days },
    })
    .then(r => r.data)

export const getObservations = (targetId?: number) =>
  api
    .get<Observation[]>('/api/observations', {
      params: targetId ? { target_id: targetId } : {},
    })
    .then(r => r.data)

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationsStatus {
  providers: {
    travelpayouts: { label: string; description: string; configured: boolean; observations: number }
    kiwi:          { label: string; description: string; configured: boolean; observations: number }
  }
  alerts: {
    telegram: { label: string; configured: boolean }
    email:    { label: string; configured: boolean }
  }
  database: {
    total_observations: number
    mock_observations: number
    real_observations: number
    last_collection: string | null
    next_collection: string | null
  }
}

export const getIntegrationsStatus = () =>
  api.get<IntegrationsStatus>('/api/integrations').then(r => r.data)

export const triggerVerify = () =>
  api.post('/api/verify').then(r => r.data)
