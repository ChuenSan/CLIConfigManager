import { create } from 'zustand'
import { Settings } from '@shared/types'

interface SettingsState {
  settings: Settings | null
  loading: boolean
  setSettings: (settings: Settings) => void
  setLoading: (loading: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,
  setSettings: (settings) => set({ settings }),
  setLoading: (loading) => set({ loading })
}))
