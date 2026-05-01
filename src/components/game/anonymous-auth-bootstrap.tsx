'use client';

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type AnonymousAuthBootstrapProps = {
  onReady?: () => void;
};

export function AnonymousAuthBootstrap({ onReady }: AnonymousAuthBootstrapProps) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

    async function waitForSession(maxAttempts = 6, delayMs = 120) {
      const supabase = createClient();

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Failed to read auth session:", error.message);
          return false;
        }

        if (data.session) {
          return true;
        }

        await wait(delayMs);
      }

      return false;
    }

    async function bootstrapAuth() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Failed to read auth session:", error.message);
        onReady?.();
        return;
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error("Anonymous sign-in failed:", signInError.message);
        } else {
          const hasSession = await waitForSession();

          if (!hasSession) {
            console.error("Anonymous sign-in succeeded but no session became available.");
          }
        }
      }

      onReady?.();
    }

    void bootstrapAuth();
  }, [onReady]);
  return null;
}
