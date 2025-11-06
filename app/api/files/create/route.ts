import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { parentPath, name, type } = await request.json();

    // Security: Ensure we're only creating within the workspace
    const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
    const normalizedParentPath = path.normalize(parentPath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedParentPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if parent directory exists
    if (!fs.existsSync(normalizedParentPath)) {
      return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
    }

    // Construct new path
    const newPath = path.join(normalizedParentPath, name);

    // Check if already exists
    if (fs.existsSync(newPath)) {
      return NextResponse.json({ error: 'A file or folder with that name already exists' }, { status: 409 });
    }

    // Create file or directory
    if (type === 'folder') {
      fs.mkdirSync(newPath);
    } else {
      // Create empty file
      fs.writeFileSync(newPath, '');
    }

    return NextResponse.json({ success: true, path: newPath });
  } catch (error) {
    console.error('Error creating file/folder:', error);
    return NextResponse.json(
      { error: 'Failed to create file or folder' },
      { status: 500 }
    );
  }
}
