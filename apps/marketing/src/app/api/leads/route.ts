import { NextResponse } from 'next/server';
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

type Lead = {
  source: 'contact' | 'trial';
  name: string;
  email: string;
  company?: string;
  message?: string;
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Omit<Lead, 'createdAt'>;

    if (!body?.source || !body?.name || !body?.email) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const lead: Lead = { ...body, createdAt: new Date().toISOString() };

    // visible en consola
    console.log('[marketing] lead:', lead);

    // Persistencia simple en dev
    const dir = join(process.cwd(), '.data');
    const file = join(dir, 'leads.jsonl');
    await mkdir(dir, { recursive: true });
    await appendFile(file, JSON.stringify(lead) + '\n', 'utf8');

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[marketing] lead error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
