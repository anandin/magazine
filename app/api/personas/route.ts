import { NextResponse } from "next/server";
import { listPersonas } from "@/lib/agents/personas";

export const runtime = "nodejs";

export async function GET() {
  const personas = await listPersonas();
  return NextResponse.json({ personas });
}
