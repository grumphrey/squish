import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { VisitsBySource } from "@/models/models";
import { useAuth } from "@/context/AuthContext";

export const useSourceMetrics = (enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["metrics", user?.userID, "source"],
    queryFn: () => {
      if (!user) return;
      return api
        .get<VisitsBySource[]>("/metrics/visits/source")
        .then((res) => res.data);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!user,
  });
};

export const useURLSourceMetrics = (enabled = true, shortCode: string) => {
  return useQuery({
    queryKey: ["metrics", shortCode, "source"],
    queryFn: () =>
      api
        .get<VisitsBySource[]>(`/metrics/visits/source/${shortCode}`)
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!shortCode,
  });
};
