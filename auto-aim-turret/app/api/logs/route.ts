import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Cloud client for direct database interaction
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jbbfztehrpjlejtwbxib.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('fire_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[API /api/logs] Supabase database fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message, data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('[API /api/logs] Unexpected fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch logs',
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, distance_cm, timestamp } = body;

    if (!target || typeof distance_cm !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: target and distance_cm are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('fire_events')
      .insert([
        {
          target: String(target),
          distance_cm: Number(distance_cm),
          timestamp: timestamp ? new Date(timestamp) : new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[API /api/logs] Supabase database insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API /api/logs] Unexpected save error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save log' },
      { status: 500 }
    );
  }
}
