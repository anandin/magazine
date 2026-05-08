import { supabaseServer } from "@/lib/supabase/server";
import type { Persona, PersonaSlug } from "@/lib/types";

export async function listPersonas(): Promise<Persona[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("personas").select("*").order("section");
  if (error) throw error;
  return (data ?? []) as Persona[];
}

export async function getPersona(slug: PersonaSlug): Promise<Persona | null> {
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

// Personas that write articles (excludes the ad desk).
export async function listWritingPersonas(): Promise<Persona[]> {
  const all = await listPersonas();
  return all.filter((p) => p.section !== "ads");
}
