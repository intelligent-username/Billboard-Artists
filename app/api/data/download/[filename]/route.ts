import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'backend', 'data');

function getContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.json': return 'application/json';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
}

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  const filePath = path.join(dataDirectory, filename);

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', getContentType(filename));
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { headers });
  } else {
    return new NextResponse('File not found', { status: 404 });
  }
}