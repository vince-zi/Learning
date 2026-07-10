// ============================================================
// Store: Session State Management (Zustand)
// 管理当前学习会话的客户端状态
// ============================================================

import { create } from 'zustand'
import type { LearningSession, Message, Photo, PracticeTask, Discovery, ModuleType } from '../core/models/session'

export interface SessionStore {
  // --- 模块 ---
  module: ModuleType
  setModule: (module: ModuleType) => void

  // --- SPA active section ---
  activeSection: 'home' | 'practice' | 'discovery' | 'review' | 'profile'
  setActiveSection: (section: 'home' | 'practice' | 'discovery' | 'review' | 'profile') => void

  // --- 会话 ---
  session: LearningSession | null
  setSession: (session: LearningSession | null) => void
  updateSession: (updates: Partial<LearningSession>) => void
  
  // --- 照片 ---
  photos: Photo[]
  addPhoto: (photo: Photo) => void
  currentPhotoIndex: number
  setCurrentPhotoIndex: (index: number) => void
  
  // --- 消息 ---
  messages: Message[]
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  
  // --- 任务 ---
  currentTask: PracticeTask | null
  setCurrentTask: (task: PracticeTask) => void
  clearCurrentTask: () => void
  
  // --- 发现 ---
  discoveries: Discovery[]
  addDiscovery: (discovery: Discovery) => void
  
  // --- 加载状态 ---
  isThinking: boolean
  setThinking: (thinking: boolean) => void
  isUploading: boolean
  setUploading: (uploading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  
  // --- 流程状态 ---
  phase: 'welcome' | 'first_round' | 'reshoot_task' | 'waiting_reshoot' | 'second_round' | 'discovery' | 'completed'
  setPhase: (phase: SessionStore['phase']) => void
  
  // --- 星图 3D 及选择状态 ---
  is3DMode: boolean
  setIs3DMode: (is3DMode: boolean) => void
  selectedNodeId: string | null
  setSelectedNodeId: (nodeId: string | null) => void

  // --- 发现总结弹窗 ---
  summaryData: any | null
  setSummaryData: (summaryData: any | null) => void

  // --- 轻松模式（关闭粒子特效） ---
  isLiteMode: boolean
  setLiteMode: (lite: boolean) => void

  // --- 重置 ---
  resetSession: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeSection: 'home',
  setActiveSection: (activeSection) => set({ activeSection }),

  module: 'english',
  setModule: (module) => set({ module }),

  is3DMode: false,
  setIs3DMode: (is3DMode) => set({ is3DMode }),
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),

  summaryData: null,
  setSummaryData: (summaryData) => set({ summaryData }),

  isLiteMode: typeof window !== 'undefined' && localStorage.getItem('learniny_lite_mode') === '1',
  setLiteMode: (lite) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('learniny_lite_mode', lite ? '1' : '0');
    }
    set({ isLiteMode: lite });
  },

  session: null,
  setSession: (session) => set({ session }),
  updateSession: (updates) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    })),

  photos: [],
  addPhoto: (photo) =>
    set((state) => ({ photos: [...state.photos, photo] })),
  currentPhotoIndex: 0,
  setCurrentPhotoIndex: (index) => set({ currentPhotoIndex: index }),

  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),

  currentTask: null,
  setCurrentTask: (task) => set({ currentTask: task }),
  clearCurrentTask: () => set({ currentTask: null }),

  discoveries: [],
  addDiscovery: (discovery) =>
    set((state) => ({ discoveries: [...state.discoveries, discovery] })),

  isThinking: false,
  setThinking: (thinking) => set({ isThinking: thinking }),
  isUploading: false,
  setUploading: (uploading) => set({ isUploading: uploading }),
  error: null,
  setError: (error) => set({ error }),

  phase: 'welcome',
  setPhase: (phase) => set({ phase }),

  resetSession: () =>
    set((state) => ({
      session: null,
      photos: [],
      messages: [],
      currentTask: null,
      discoveries: [],
      isThinking: false,
      isUploading: false,
      error: null,
      phase: 'welcome',
      currentPhotoIndex: 0,
      summaryData: null,
      // Keep module selection across sessions
      module: state.module,
    })),
}))
