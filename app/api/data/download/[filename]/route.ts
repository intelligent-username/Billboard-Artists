import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDirectory = path.join(process.cwd(), 'data');

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  const filePath = path.join(dataDirectory, filename);

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new NextResponse(fileContent, { headers });
  } else {
    return new NextResponse('File not found', { status: 404 });
  }
}