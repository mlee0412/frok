import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });

    // Convert File to Buffer for OpenAI API
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Can be made dynamic
      response_format: 'json',
    });

    return NextResponse.json({
      ok: true,
      text: transcription.text,
    });
  } catch (error: any) {
    console.error('[transcribe error]', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
