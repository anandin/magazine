import { supabaseServer } from "@/lib/supabase/server";
import type { AgentSlug, Persona } from "@/lib/types";

export async function listPersonas(): Promise<Persona[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("personas")
    .select("*")
    .order("slug");
  if (error) throw error;
  return (data ?? []) as Persona[];
}

export async function getPersona(slug: AgentSlug): Promise<Persona | null> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("personas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Persona) ?? null;
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("personas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Persona) ?? null;
}
