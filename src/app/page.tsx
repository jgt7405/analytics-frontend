"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/basketball/wins");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner />
    </div>
  );
}
