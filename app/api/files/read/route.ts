import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  try {
    // Security: Ensure we're only reading from the workspace
    const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
    const normalizedPath = path.normalize(filePath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const content = fs.readFileSync(normalizedPath, 'utf-8');

    return NextResponse.json({ content, path: normalizedPath });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
