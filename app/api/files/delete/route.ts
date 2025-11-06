import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    // Security: Ensure we're only deleting from the workspace
    const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
    const normalizedPath = path.normalize(filePath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if path exists
    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'File or folder not found' }, { status: 404 });
    }

    // Delete file or directory (recursive for directories)
    const stats = fs.statSync(normalizedPath);
    if (stats.isDirectory()) {
      fs.rmSync(normalizedPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(normalizedPath);
    }

    return NextResponse.json({ success: true, path: normalizedPath });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file or folder' },
      { status: 500 }
    );
  }
}
