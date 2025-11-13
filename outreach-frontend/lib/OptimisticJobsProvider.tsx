"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface OptimisticJob {
  id: string; // temporary ID
  status: "pending" | "in_progress";
  filename: string;
  rows: number;
  created_at: number;
  finished_at: null;
  error: null;
  progress: 0;
  message: null;
  isOptimistic: true; // flag to identify optimistic jobs
}

interface OptimisticJobsContextProps {
  optimisticJobs: OptimisticJob[];
  addOptimisticJob: (job: OptimisticJob) => void;
  removeOptimisticJob: (id: string) => void;
  clearOptimisticJobs: () => void;
}

const OptimisticJobsContext = createContext<OptimisticJobsContextProps>({
  optimisticJobs: [],
  addOptimisticJob: () => {},
  removeOptimisticJob: () => {},
  clearOptimisticJobs: () => {},
});

export const useOptimisticJobs = () => useContext(OptimisticJobsContext);

export function OptimisticJobsProvider({ children }: { children: ReactNode }) {
  const [optimisticJobs, setOptimisticJobs] = useState<OptimisticJob[]>([]);

  const addOptimisticJob = useCallback((job: OptimisticJob) => {
    setOptimisticJobs((prev) => [job, ...prev]);
  }, []);

  const removeOptimisticJob = useCallback((id: string) => {
    setOptimisticJobs((prev) => prev.filter((job) => job.id !== id));
  }, []);

  const clearOptimisticJobs = useCallback(() => {
    setOptimisticJobs([]);
  }, []);

  const value: OptimisticJobsContextProps = {
    optimisticJobs,
    addOptimisticJob,
    removeOptimisticJob,
    clearOptimisticJobs,
  };

  return (
    <OptimisticJobsContext.Provider value={value}>
      {children}
    </OptimisticJobsContext.Provider>
  );
}
