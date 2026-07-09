import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export function useCreateShortURL() {
  return useMutation({ mutationFn: getShortURL });
}

// Takes long URL and optional slug from user input and makes a request to backend server to generate the corresponding short URL.
// Throws an error if server returns non-successful status code.
async function getShortURL(
  payload: GetShortURLRequest,
): Promise<GetShortURLResponse> {
  const response = await api.post<GetShortURLResponse>("/shorten", payload);

  return response.data;
}

export interface GetShortURLResponse {
  qr_code: string;
  short_url: string;
}

export interface GetShortURLRequest {
  url: string;
  slug?: string;
  qr_code?: boolean;
}
