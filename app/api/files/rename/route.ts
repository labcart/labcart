import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { oldPath, newName } = await request.json();

    // Security: Ensure we're only renaming within the workspace
    const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
    const normalizedOldPath = path.normalize(oldPath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedOldPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if old path exists
    if (!fs.existsSync(normalizedOldPath)) {
      return NextResponse.json({ error: 'File or folder not found' }, { status: 404 });
    }

    // Construct new path
    const parentDir = path.dirname(normalizedOldPath);
    const newPath = path.join(parentDir, newName);

    // Check if new name already exists
    if (fs.existsSync(newPath)) {
      return NextResponse.json({ error: 'A file or folder with that name already exists' }, { status: 409 });
    }

    // Rename
    fs.renameSync(normalizedOldPath, newPath);

    return NextResponse.json({ success: true, oldPath: normalizedOldPath, newPath });
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json(
      { error: 'Failed to rename file or folder' },
      { status: 500 }
    );
  }
}
