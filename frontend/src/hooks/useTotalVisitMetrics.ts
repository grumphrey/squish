import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TotalVisitMetrics } from "@/models/models";
import { useAuth } from "@/context/AuthContext";

// Get total visits metrics all-time for all URLs belonging to a user.
export const useTotalVisitMetrics = (enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["metrics", user?.userID, "totalVisits"],
    queryFn: () => {
      if (!user) return;
      return api
        .get<TotalVisitMetrics>("/metrics/visits/total")
        .then((res) => res.data);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!user,
  });
};

// Get total visits metrics all-time for a given URL.
export const useURLTotalVisitMetrics = (enabled = true, shortCode: string) => {
  return useQuery({
    queryKey: ["metrics", shortCode, "totalVisits"],
    queryFn: () =>
      api
        .get<TotalVisitMetrics>(`/metrics/visits/total/${shortCode}`)
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!shortCode,
  });
};
