import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VisitsPastWeek } from "@/models/models";
import { useAuth } from "@/context/AuthContext";

// Get daily visits metrics for the past 7 days for all URLs belonging to a user.
export const usePastWeekMetrics = (enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["metrics", user?.userID, "pastWeek"],
    queryFn: () => {
      if (!user) return;
      return api
        .get<VisitsPastWeek>("/metrics/visits/daily")
        .then((res) => res.data);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!user,
  });
};

// Get daily visits metrics for the past 7 days for a given URL.
export const useURLPastWeekMetrics = (enabled = true, shortCode: string) => {
  return useQuery({
    queryKey: ["metrics", shortCode, "pastWeek"],
    queryFn: () =>
      api
        .get<VisitsPastWeek>(`/metrics/visits/daily/${shortCode}`)
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!shortCode,
  });
};
