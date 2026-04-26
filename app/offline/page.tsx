"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <div className="mx-auto max-w-md rounded-2xl border bg-card/60 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">You are offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app could not reach the network. Reconnect and try again.
        </p>
        <div className="mt-5 flex justify-center">
          <Button asChild>
            <Link href="/">Retry</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
