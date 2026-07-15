import { IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface RefreshButtonProps {
  handleRefresh: () => void;
  isRefreshing: boolean;
}

export default function RefreshButton({
  handleRefresh,
  isRefreshing,
}: RefreshButtonProps) {
  return (
    <Button
      className="font-sans"
      variant="outline"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      {isRefreshing ? (
        <>
          <Spinner data-icon="inline-start" /> Loading
        </>
      ) : (
        <>
          <IconRefresh /> Refresh
        </>
      )}
    </Button>
  );
}
