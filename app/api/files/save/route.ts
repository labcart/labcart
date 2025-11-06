import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Save file endpoint
 * Handles writing content back to the file system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content required' },
        { status: 400 }
      );
    }

    // Security: Ensure we're only writing to the workspace
    const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
    const normalizedPath = path.normalize(filePath);
    const normalizedWorkspace = path.normalize(workspacePath);
    if (!normalizedPath.startsWith(normalizedWorkspace)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create backup before saving (for recovery)
    const backupDir = path.join(workspacePath, '.backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup with timestamp
    const fileName = path.basename(normalizedPath);
    const backupPath = path.join(backupDir, `${fileName}.${Date.now()}.backup`);

    try {
      if (fs.existsSync(normalizedPath)) {
        fs.copyFileSync(normalizedPath, backupPath);
      }
    } catch (backupError) {
      console.warn('Failed to create backup:', backupError);
      // Continue with save even if backup fails
    }

    // Write the file
    fs.writeFileSync(normalizedPath, content, 'utf-8');

    // Clean up old backups (keep last 5)
    try {
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(fileName))
        .sort()
        .reverse();

      if (backups.length > 5) {
        backups.slice(5).forEach(backup => {
          fs.unlinkSync(path.join(backupDir, backup));
        });
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up old backups:', cleanupError);
    }

    return NextResponse.json({
      success: true,
      path: normalizedPath,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
