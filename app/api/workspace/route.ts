import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/workspace
 * Returns the current workspace path (default: /opt/lab/labcart for now)
 */
export async function GET() {
  // For now, return default workspace
  // Later: Read from config file or environment
  const workspacePath = process.env.LABCART_WORKSPACE || '/opt/lab/labcart';

  return NextResponse.json({
    workspacePath,
    exists: fs.existsSync(workspacePath)
  });
}

/**
 * POST /api/workspace
 * Sets the workspace path (validate it exists and is accessible)
 */
export async function POST(request: NextRequest) {
  try {
    const { workspacePath } = await request.json();

    if (!workspacePath) {
      return NextResponse.json(
        { error: 'Workspace path is required' },
        { status: 400 }
      );
    }

    // Normalize and validate path
    const normalizedPath = path.normalize(workspacePath);

    // Check if directory exists
    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: 'Directory does not exist' },
        { status: 404 }
      );
    }

    // Check if it's a directory
    const stats = fs.statSync(normalizedPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }

    // TODO: In future, write to config file or environment
    // For now, just validate and return

    return NextResponse.json({
      success: true,
      workspacePath: normalizedPath
    });
  } catch (error) {
    console.error('Error setting workspace:', error);
    return NextResponse.json(
      { error: 'Failed to set workspace' },
      { status: 500 }
    );
  }
}
