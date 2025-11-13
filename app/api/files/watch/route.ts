import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Server-Sent Events (SSE) endpoint for file system watching
 * This provides real-time updates when files/folders change
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const workspacePath = searchParams.get('workspace') || process.env.LABCART_WORKSPACE || '/opt/lab/labcart';
  const dirPath = searchParams.get('path') || workspacePath;

  // Validate workspace path exists
  if (!workspacePath || !dirPath) {
    return new Response('Workspace path is required', { status: 400 });
  }

  // Check if path exists before watching
  if (!fs.existsSync(dirPath)) {
    return new Response('Directory does not exist', { status: 404 });
  }

  // Security check
  const normalizedPath = path.normalize(dirPath);
  const normalizedWorkspace = path.normalize(workspacePath);
  if (!normalizedPath.startsWith(normalizedWorkspace)) {
    return new Response('Access denied', { status: 403 });
  }

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Watch the directory for changes
      let watcher: fs.FSWatcher | null = null;

      try {
        watcher = fs.watch(normalizedPath, { recursive: false }, (eventType, filename) => {
          if (filename) {
            console.log(`File system change detected: ${eventType} - ${filename}`);

            // Send the change event to the client
            const event = {
              type: 'change',
              eventType,
              filename,
              timestamp: Date.now(),
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          if (watcher) {
            watcher.close();
            console.log(`Stopped watching: ${normalizedPath}`);
          }
          controller.close();
        });

      } catch (error) {
        console.error('Error setting up file watcher:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Failed to watch directory' })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
