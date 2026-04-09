import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

async function getRequestAccessToken(): Promise<string | null> {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function createClient() {
  const cookieStore = await cookies();
  const accessToken = await getRequestAccessToken();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // In some server rendering contexts, setting cookies is not available.
        }
      },
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to read authenticated user: ${error.message}`);
  }

  if (data.user) {
    return data.user;
  }

  const accessToken = await getRequestAccessToken();

  if (!accessToken) {
    return null;
  }

  const { data: tokenData, error: tokenError } = await supabase.auth.getUser(accessToken);

  if (tokenError) {
    throw new Error(`Failed to read authenticated user from bearer token: ${tokenError.message}`);
  }

  return tokenData.user;
}
