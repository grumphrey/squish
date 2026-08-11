import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { TopLink } from "@/models/models";

export const useTopLinks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["metrics", user?.userID, "topLinks"],
    queryFn: () =>
      api.get<TopLink[]>("/metrics/top-links").then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: !!user,
  });
};
