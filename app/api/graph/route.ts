import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { GraphSettings } from '@/lib/types/graph';
import { shrinkGraph } from '@/lib/graph/processing';

const dataPath = path.join(process.cwd(), 'data', 'collaborations.json');

// In-memory cache
const cache = new Map<string, any>();

export async function POST(request: Request) {
  try {
    const settings: GraphSettings = await request.json();
    const cacheKey = JSON.stringify(settings);

    // Check cache first
    if (cache.has(cacheKey)) {
      return NextResponse.json(cache.get(cacheKey));
    }

    // Read data
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Shrink graph
    const graphData = shrinkGraph(data, settings.vertexLimit, settings.shrinkMethod);

    // Cache the result
    cache.set(cacheKey, graphData);

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error generating graph:', error);
    return NextResponse.json({ error: 'Failed to generate graph' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const settingsParam = searchParams.get('settings');

  if (!settingsParam) {
    return NextResponse.json({ error: 'Missing settings' }, { status: 400 });
  }

  try {
    const settings = JSON.parse(settingsParam);
    const cacheKey = JSON.stringify(settings);

    if (cache.has(cacheKey)) {
      return NextResponse.json({ cached: true, data: cache.get(cacheKey) });
    } else {
      return NextResponse.json({ cached: false });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
  }
}
