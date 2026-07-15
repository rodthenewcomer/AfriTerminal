"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function BillingButton({ kind, children }: { kind: "checkout" | "portal"; children: string }) {
  const { session } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!session?.access_token) {
      window.location.href = "/connexion";
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/billing/${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Idempotency-Key": crypto.randomUUID().replace(/-/g, ""),
        },
      });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error ?? "Facturation indisponible");
      window.location.assign(body.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Facturation indisponible");
      setPending(false);
    }
  };

  return (
    <div>
      <Button variant="accent" className="h-10 w-full" onClick={() => void start()} disabled={pending}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
      {error ? <p role="alert" className="mt-2 text-xs text-down">{error}</p> : null}
    </div>
  );
}
