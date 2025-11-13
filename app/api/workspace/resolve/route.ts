import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/workspace/resolve
 * Resolves a folder name to its full filesystem path
 *
 * This allows the File System Access API picker to work properly:
 * 1. User picks folder with native picker
 * 2. Browser only gives us folder name (e.g., "labcart")
 * 3. We search filesystem to find full path (e.g., "/Users/macbook/play/lab/labcart")
 * 4. Return full path to use with all file operations
 */
export async function POST(request: NextRequest) {
  try {
    const { folderName, searchPaths } = await request.json();

    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Sanitize folder name to prevent command injection
    const sanitizedName = folderName.replace(/[;&|`$(){}]/g, '');

    // Default search paths if none provided
    const pathsToSearch = searchPaths || [
      process.env.HOME || '/home',
      '/Users',
      '/opt',
      process.cwd(),
    ];

    console.log(`🔍 Searching for folder: "${sanitizedName}"`);

    // Try each search path
    for (const searchPath of pathsToSearch) {
      try {
        // Use find command to search for the folder
        // -maxdepth 5 limits recursion to avoid searching entire filesystem
        // -type d ensures we only find directories
        // -name matches the exact folder name
        const command = `find "${searchPath}" -maxdepth 5 -type d -name "${sanitizedName}" 2>/dev/null | head -1`;

        const result = execSync(command, {
          encoding: 'utf8',
          timeout: 5000, // 5 second timeout
        }).trim();

        if (result) {
          // Verify the path exists and is a directory
          if (fs.existsSync(result) && fs.statSync(result).isDirectory()) {
            console.log(`✅ Found: ${result}`);

            return NextResponse.json({
              success: true,
              path: result,
              folderName: sanitizedName,
            });
          }
        }
      } catch (error) {
        // Continue to next search path if this one fails
        console.log(`  Skipping ${searchPath} (not accessible or not found)`);
        continue;
      }
    }

    // If we get here, folder wasn't found
    return NextResponse.json(
      {
        error: 'Folder not found',
        message: `Could not find folder "${sanitizedName}" in any search location`,
        searchedPaths: pathsToSearch,
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error resolving workspace path:', error);
    return NextResponse.json(
      {
        error: 'Failed to resolve workspace path',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
