"use client";

import { useEffect } from "react";

export default function LawReformerPage() {
  useEffect(() => {
    window.location.replace("https://ai.lawreformer.com/");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to AI LawReformer...</p>
    </div>
  );
}
