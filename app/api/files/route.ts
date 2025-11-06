import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workspacePath = searchParams.get('workspace') || process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
  const dirPath = searchParams.get('path') || workspacePath;

  try {
    // Security: Ensure we're only reading from the workspace
    const normalizedPath = path.normalize(dirPath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const items = fs.readdirSync(normalizedPath, { withFileTypes: true });

    const files = items.map(item => ({
      name: item.name,
      path: path.join(normalizedPath, item.name),
      isDirectory: item.isDirectory(),
      isFile: item.isFile(),
    }))
    .filter(item => !item.name.startsWith('.')) // Hide hidden files
    .sort((a, b) => {
      // Directories first, then files, alphabetically
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ files, path: normalizedPath });
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    );
  }
}
