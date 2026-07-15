import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DeleteLinkDialogProps {
  shortCode: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}
export function DeleteLinkDialog({
  shortCode,
  open,
  setOpen,
}: DeleteLinkDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const displayShortURL = "/" + shortCode;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.post("/url/delete", { short_url: shortCode });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "urls"] });

      toast.success(
        <div>
          Successfully deleted{" "}
          <span className="text-(--color-primary)">{displayShortURL}</span>
        </div>,
        {
          position: "top-center",
        },
      );
    } catch (err) {
      toast.error(
        <div>
          There was a problem trying to delete{" "}
          <span className="text-(--color-primary)">{displayShortURL}</span>.
        </div>,
        {
          description: (
            <div className="text-(--color-text)">Please try again later.</div>
          ),
          position: "top-center",
        },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isDeleting}>
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent size="sm" className="font-sans">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>

          <AlertDialogTitle>Delete link?</AlertDialogTitle>

          <AlertDialogDescription>
            This will permanently delete this short link. This action is
            unreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
