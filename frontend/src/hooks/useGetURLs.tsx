import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShortURLRecord } from "@/models/models";

export const useGetURLs = () => {
  return useQuery({
    queryKey: ["dashboard", "urls"],
    queryFn: () =>
      api.get<ShortURLRecord[]>("/urls").then((res) => {
        return res.data.map((urlRecord) => {
          return { ...urlRecord, created_at: new Date(urlRecord.created_at) };
        });
      }),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });
};
