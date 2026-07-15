import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DeviceMetrics } from "@/models/models";
import { useAuth } from "@/context/AuthContext";

// Get device metrics (browser, device type, OS, country) for all URLs belonging to the user.
export const useDeviceMetrics = (enabled = true) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["metrics", user?.userID, "device"],
    queryFn: () => {
      if (!user) return;
      return api.get<DeviceMetrics>("/metrics/device").then((res) => res.data);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!user,
  });
};

// Get device metrics (browser, device type, OS, country) for a given URL.
export const useURLDeviceMetrics = (enabled = true, shortCode: string) => {
  return useQuery({
    queryKey: ["metrics", shortCode, "device"],
    queryFn: () =>
      api
        .get<DeviceMetrics>(`/metrics/device/${shortCode}`)
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
    enabled: enabled && !!shortCode,
  });
};
