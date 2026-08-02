import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, updateSettings } from '@/lib/db/settings'

export async function GET() {
  try {
    const data = await getAllSettings()
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const values = (body?.values ?? {}) as Record<string, string>
    await updateSettings(values)
    const data = await getAllSettings()
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
