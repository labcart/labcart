import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * POST /api/workspace/identify
 * Identifies or creates a workspace by checking for .labcart/workspace.json
 *
 * This allows workspaces to maintain identity across browser cache clears.
 * The workspace ID is stored in the workspace folder itself.
 */
export async function POST(request: NextRequest) {
  try {
    const { workspacePath } = await request.json();

    if (!workspacePath || typeof workspacePath !== 'string') {
      return NextResponse.json(
        { error: 'Workspace path is required' },
        { status: 400 }
      );
    }

    // Verify the workspace path exists
    if (!fs.existsSync(workspacePath)) {
      return NextResponse.json(
        { error: 'Workspace path does not exist' },
        { status: 404 }
      );
    }

    // Check if it's a directory
    const stats = fs.statSync(workspacePath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: 'Workspace path must be a directory' },
        { status: 400 }
      );
    }

    const labcartDir = path.join(workspacePath, '.labcart');
    const workspaceFile = path.join(labcartDir, 'workspace.json');

    let workspaceId: string;
    let isNew = false;

    // Check if .labcart/workspace.json exists
    if (fs.existsSync(workspaceFile)) {
      // Read existing workspace ID
      try {
        const fileContent = fs.readFileSync(workspaceFile, 'utf8');
        const data = JSON.parse(fileContent);

        if (data.workspaceId && typeof data.workspaceId === 'string') {
          workspaceId = data.workspaceId;
          console.log(`\n🔵 WORKSPACE IDENTIFIED (Existing):`);
          console.log(`   Workspace ID: ${workspaceId}`);
          console.log(`   Path: ${workspacePath}`);
          console.log(`   Created: ${data.createdAt}`);
          console.log(`   Source: .labcart/workspace.json\n`);
        } else {
          // Invalid format - regenerate
          throw new Error('Invalid workspace.json format');
        }
      } catch (error) {
        console.error('Error reading workspace.json:', error);
        // File is corrupted - regenerate
        workspaceId = randomUUID();
        isNew = true;
      }
    } else {
      // New workspace - generate UUID
      workspaceId = randomUUID();
      isNew = true;
      console.log(`\n🟢 WORKSPACE CREATED (New):`);
      console.log(`   Workspace ID: ${workspaceId}`);
      console.log(`   Path: ${workspacePath}\n`);
    }

    // Create or update the .labcart directory and workspace.json
    if (isNew) {
      // Create .labcart directory if it doesn't exist
      if (!fs.existsSync(labcartDir)) {
        fs.mkdirSync(labcartDir, { recursive: true });
      }

      // Write workspace.json
      const workspaceData = {
        workspaceId,
        createdAt: new Date().toISOString(),
        path: workspacePath,
      };

      fs.writeFileSync(workspaceFile, JSON.stringify(workspaceData, null, 2), 'utf8');

      // Create .gitignore if it doesn't exist
      const gitignorePath = path.join(labcartDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, '# LabCart workspace metadata\n*\n', 'utf8');
      }

      console.log(`✓ Created .labcart/workspace.json`);
    }

    return NextResponse.json({
      success: true,
      workspaceId,
      workspacePath,
      isNew,
    });

  } catch (error) {
    console.error('Error identifying workspace:', error);
    return NextResponse.json(
      {
        error: 'Failed to identify workspace',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
