import { NextResponse } from 'next/server';
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

type Event = {
  name: string;
  props?: Record<string, unknown>;
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Omit<Event, 'createdAt'>;
    if (!body?.name) {
      return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 });
    }

    const ev: Event = { ...body, createdAt: new Date().toISOString() };
    console.log('[marketing] event:', ev);

    const dir = join(process.cwd(), '.data');
    const file = join(dir, 'events.jsonl');
    await mkdir(dir, { recursive: true });
    await appendFile(file, JSON.stringify(ev) + '\n', 'utf8');

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[marketing] event error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
