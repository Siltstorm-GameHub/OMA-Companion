import { NextResponse } from "next/server";
export async function GET()  { return NextResponse.json(null); }
export async function POST() { return NextResponse.json({ ok: true }); }
