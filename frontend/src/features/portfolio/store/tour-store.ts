import { create } from 'zustand'

export type TourStep =
  | 'idle'
  | 'starting'
  | 'upload'
  | 'plan'
  | 'execute'
  | 'review'
  | 'publish'
  | 'recap'
  | 'error'

interface TourState {
  step: TourStep
  demoProjectId: string | null
  sourceVideoAssetId: string | null
  workflowPlanId: string | null
  resultVideoAssetId: string | null
  autoUploadFile: File | null
  error: string | null

  setStep: (step: TourStep) => void
  start: (demoProjectId: string) => void
  setSourceVideoAssetId: (id: string) => void
  setWorkflowPlanId: (id: string) => void
  setResultVideoAssetId: (id: string) => void
  setAutoUploadFile: (file: File) => void
  setError: (message: string) => void
  reset: () => void
}

const initialState = {
  step: 'idle' as TourStep,
  demoProjectId: null,
  sourceVideoAssetId: null,
  workflowPlanId: null,
  resultVideoAssetId: null,
  autoUploadFile: null,
  error: null,
}

export const useTourStore = create<TourState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  start: (demoProjectId) =>
    set({ ...initialState, step: 'upload', demoProjectId }),

  setSourceVideoAssetId: (sourceVideoAssetId) => set({ sourceVideoAssetId }),
  setWorkflowPlanId: (workflowPlanId) => set({ workflowPlanId }),
  setResultVideoAssetId: (resultVideoAssetId) => set({ resultVideoAssetId }),
  setAutoUploadFile: (autoUploadFile) => set({ autoUploadFile }),
  setError: (error) => set({ step: 'error', error }),

  reset: () => set(initialState),
}))
