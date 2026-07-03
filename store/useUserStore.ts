import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export type MistakeStatus = 'chaos' | 'mastered'

export interface Mistake {
  id: string
  text: string
  status: MistakeStatus
}

interface UserState {
  isLoggedIn: boolean
  userId: string | null
  mistakes: Mistake[]
  loginAnonymous: () => void
  logout: () => void
  masterMistake: (id: string) => void // For future use
}

// Initial mock data to showcase the "chaos" vs "mastered" visual
const MOCK_MISTAKES: Mistake[] = [
  { id: '1', text: "He don't", status: 'chaos' },
  { id: '2', text: 'In Monday', status: 'chaos' },
  { id: '3', text: 'Suppose that', status: 'chaos' },
  { id: '4', text: 'I am agree', status: 'chaos' },
  { id: '5', text: 'Discuss about', status: 'chaos' },
  { id: '6', text: 'Look forward to see', status: 'chaos' },
  { id: '7', text: 'Actually,', status: 'mastered' },
  { id: '8', text: 'I was wondering', status: 'mastered' },
  { id: '9', text: 'Could you please', status: 'mastered' },
  { id: '10', text: 'On Monday', status: 'mastered' },
]

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userId: null,
      mistakes: [],
      
      loginAnonymous: () => set({
        isLoggedIn: true,
        userId: uuidv4(),
        mistakes: MOCK_MISTAKES
      }),
      
      logout: () => set({
        isLoggedIn: false,
        userId: null,
        mistakes: []
      }),

      masterMistake: (id) => set((state) => ({
        mistakes: state.mistakes.map(m => 
          m.id === id ? { ...m, status: 'mastered' } : m
        )
      }))
    }),
    {
      name: 'learniny-user-storage',
    }
  )
)
