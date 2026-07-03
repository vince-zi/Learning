import { create } from 'zustand'

type PulseType = 'user' | 'correction' | null

interface VisualState {
  pulseEvent: { type: PulseType; timestamp: number }
  triggerPulse: (type: PulseType) => void
}

export const useVisualStore = create<VisualState>((set) => ({
  pulseEvent: { type: null, timestamp: 0 },
  triggerPulse: (type) => set({ pulseEvent: { type, timestamp: Date.now() } }),
}))
