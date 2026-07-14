import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export default function useEditShortURL() {
  return useMutation({ mutationFn: editShortURL });
}

async function editShortURL(
  payload: EditShortURLRequest,
): Promise<EditShortURLResponse> {
  const response = await api.post<EditShortURLRequest>("/url/edit", payload);

  return response.data;
}

export interface EditShortURLRequest {
  short_url: string;
  is_qrcode?: boolean;
}

export interface EditShortURLResponse {}
