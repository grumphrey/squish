import dogLogo from "@/assets/dog-logo-qr.png";
import {
  IconPlus,
  IconDownload,
  IconQrcode,
  IconShare2,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import QRCodeStyling from "qr-code-styling";
import useEditShortURL from "@/hooks/useEditShortURL";
import { DEFAULT_ERR } from "@/constants";

interface QRCodeDialogProps {
  isQRCode: boolean;
  shortCode: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

// TODO: Allow users to customize QR code
export default function QRCodeDialog({
  isQRCode,
  shortCode,
  open,
  setOpen,
}: QRCodeDialogProps) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useEditShortURL();
  const createQRCode = () => {
    const payload = { short_url: shortCode, is_qrcode: true };
    mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard", "urls"] });
      },
      onError: () => toast.error(DEFAULT_ERR),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <IconQrcode />
        </Button>
      </DialogTrigger>

      <DialogContent>
        {isQRCode ? (
          <URLQRCode shortCode={shortCode} />
        ) : (
          <EmptyQRCode handleCreate={createQRCode} isPending={isPending} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface URLQRCodeProps {
  shortCode: string;
}

function SetQueryParam(url: string, key: string, val: string) {
  const u = new URL(url);
  u.searchParams.set(key, val);

  return u.toString();
}

const URLQRCode = ({ shortCode }: URLQRCodeProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const fileName = `squish-qrcode-${shortCode}`;

  // TODO: difficult to make width and height responsive? just set to a agreeable size for both mobile/desktop for now
  const qrCode = useMemo(() => {
    const url = window.location.origin + "/" + shortCode;
    const link = SetQueryParam(url, "src", "qr");
    return new QRCodeStyling({
      width: 280,
      height: 280,
      data: link,
      image: dogLogo,
      dotsOptions: {
        color: "black",
        type: "rounded",
      },
      imageOptions: {
        crossOrigin: "anonymous",
      },
    });
  }, [shortCode]);

  // Callback ref only runs when ref node is mounted
  const setQrRef = (node: HTMLDivElement | null) => {
    if (!node) return;

    divRef.current = node;
    node.innerHTML = "";
    qrCode.append(node);
  };

  const handleDownload = () => {
    if (!qrCode) return;
    qrCode.download({ name: fileName, extension: "png" });
  };

  const handleShare = async () => {
    const container = divRef.current;
    if (!container) return;

    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    // Convert image to blob, then run callback func to call web share API
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], fileName + ".png", { type: "image/png" });

        if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
          toast.error(DEFAULT_ERR);
          return;
        }

        await navigator.share({
          files: [file],
        });
      }, "image/png");
    } catch {
      toast.error(DEFAULT_ERR);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex gap-1 items-center">
          <IconQrcode height="16px" />
          Your QR Code
        </DialogTitle>
        <DialogDescription className="font-mono wrap-anywhere">
          <span>URL: </span>
          <span>{window.location.protocol}</span>
          <span>//</span>
          <span>{window.location.hostname}</span>
          <span>/</span>
          <span className="text-(--color-primary) inline-block">
            {shortCode}
          </span>
        </DialogDescription>
      </DialogHeader>

      <div
        ref={setQrRef}
        className="m-auto border-10 border-primary rounded-2xl"
      />

      <DialogFooter className="font-sans">
        <Button variant="default" onClick={handleDownload}>
          <IconDownload />
          Download QR
        </Button>

        <Button variant="secondary" onClick={handleShare}>
          <IconShare2 /> Share
        </Button>
      </DialogFooter>
    </>
  );
};

const EmptyQRCode = ({
  handleCreate,
  isPending,
}: {
  handleCreate: () => void;
  isPending: boolean;
}) => {
  return (
    <Empty className="font-sans">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconQrcode />
        </EmptyMedia>
        <EmptyTitle>Nothing to scan, nothing to see.</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created a QR code for this short link yet.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="default" onClick={handleCreate}>
          {isPending ? (
            <>
              <Spinner /> Loading...
            </>
          ) : (
            <>
              <IconPlus /> Generate QR Code
            </>
          )}
        </Button>
      </EmptyContent>
    </Empty>
  );
};
