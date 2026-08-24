import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export default function useEditShortURL() {
  return useMutation({ mutationFn: editShortURL });
}

async function editShortURL(
  payload: EditShortURLRequest,
): Promise<void> {
  const { shortCode, is_qrcode } = payload;
  await api.patch(`/urls/${encodeURIComponent(shortCode)}`, { is_qrcode });
}

export interface EditShortURLRequest {
  shortCode: string;
  is_qrcode: boolean;
}
