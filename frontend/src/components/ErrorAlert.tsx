import { CircleX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorAlertProps {
  message?: string;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <Alert className="font-sans w-full flex flex-row items-start gap-3 border-destructive/80 bg-destructive/5 text-destructive">
      <CircleX className="size-4 shrink-0 translate-y-0.5 text-destructive/60" />
      <div className="flex flex-1 items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-destructive/80">
            {message ??
              "There was a problem processing your request. Please try again later."}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
