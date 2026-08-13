import { create } from 'zustand'

interface AppState {
  selectedProjectName: string | null
  selectProject: (name: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedProjectName: null,
  selectProject: (name): void => set({ selectedProjectName: name })
}))
