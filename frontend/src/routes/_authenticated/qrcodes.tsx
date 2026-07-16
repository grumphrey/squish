import { IconQrcode } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { URLSearchInput } from "./links";
import URLsList from "@/components/URLsList";
import { useGetURLs } from "@/hooks/useGetURLs";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isPending, error } = useGetURLs();

  return (
    <>
      <title>squi.sh — QR Codes</title>
      <section className="max-w-5xl w-full my-0 mx-auto px-5 py-10 flex flex-col gap-5 sm:px-20">
        <div className="flex justify-between items-center font-sans">
          <h1 className="flex items-center gap-3 text-3xl font-sans font-bold tracking-tighter mb-5 md:text-4xl mr-10">
            QR Codes <IconQrcode size="40px" />
          </h1>
          <URLSearchInput query={searchTerm} setQuery={setSearchTerm} />
        </div>

        {/* TODO: move props out of urlslist into parent */}
        <URLsList
          data={data}
          error={error}
          isPending={isPending}
          query={searchTerm}
          isQROnly
        />
      </section>
    </>
  );
}
