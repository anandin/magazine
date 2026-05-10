import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Auth-aware Supabase client. Reads the current user's session from cookies
// and applies their identity on every query (RLS uses auth.uid()). Use this
// in server components and route handlers that act on behalf of a user.
export async function supabaseAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Setting cookies is only allowed in route handlers / actions;
              // server components ignore the write silently.
            }
          }
        },
      },
    },
  );
}

export async function getCurrentUserId(): Promise<string | null> {
  const sb = await supabaseAuth();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

// For routes that strictly require a signed-in user.
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("not authenticated");
  return id;
}
