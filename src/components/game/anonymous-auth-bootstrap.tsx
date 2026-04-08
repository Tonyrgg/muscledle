'use client';

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AnonymousAuthBootstrapProps = {
  onReady?: () => void;
};

export function AnonymousAuthBootstrap({ onReady }: AnonymousAuthBootstrapProps) {
  const hasRunRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    async function bootstrapAuth() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to read auth session:", error.message);
        setIsLoading(false);
        onReady?.();
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error("Anonymous sign-in failed:", signInError.message);
        }
      }

      setIsLoading(false);
      onReady?.();
    }

    void bootstrapAuth();
  }, [onReady]);

  if (!isLoading) {
    return null;
  }

  return <p className="text-sm text-zinc-400">Signing in anonymously...</p>;
}
