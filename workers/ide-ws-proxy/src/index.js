/**
 * IDE WebSocket Proxy Worker
 *
 * Routes both WebSocket and HTTP connections between:
 * - Frontend clients (from labcart.io/ide)
 * - Bot servers (from user VPSs)
 *
 * Architecture:
 * 1. Bot servers connect via WebSocket and send userId + serverUrl in handshake
 * 2. Frontend clients connect via WebSocket with userId
 * 3. Frontend clients make HTTP requests to /proxy/* endpoints
 * 4. Worker routes WebSocket messages and proxies HTTP requests to bot servers
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    // Handle CORS preflight for HTTP requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Handle HTTP proxy requests
    if (!upgradeHeader && url.pathname.startsWith('/proxy/')) {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response('Missing userId parameter', { status: 400 });
      }

      // Get Durable Object for this user
      const id = env.PROXY_ROUTER.idFromName(userId);
      const stub = env.PROXY_ROUTER.get(id);

      // Forward HTTP request to Durable Object
      return stub.fetch(request);
    }

    // Handle WebSocket connections
    if (upgradeHeader === 'websocket') {
      const userId = url.searchParams.get('userId');
      const clientType = url.searchParams.get('type'); // 'bot-server' or 'client'

      if (!userId) {
        return new Response('Missing userId parameter', { status: 400 });
      }

      // Get or create Durable Object for this user
      const id = env.PROXY_ROUTER.idFromName(userId);
      const stub = env.PROXY_ROUTER.get(id);

      // Forward WebSocket upgrade to Durable Object
      return stub.fetch(request);
    }

    return new Response('Expected WebSocket or /proxy/* path', { status: 400 });
  }
};

/**
 * Durable Object: ProxyRouter
 *
 * Maintains WebSocket connections and HTTP proxy for a single user:
 * - One bot server WebSocket connection
 * - Multiple client WebSocket connections
 * - Bot server HTTP URL for proxying HTTP requests
 */
export class ProxyRouter {
  constructor(state, env) {
    this.state = state;
    this.botServer = null; // WebSocket to bot server
    this.clients = new Set(); // WebSockets to frontend clients
    this.botServerUrl = null; // HTTP URL of bot server
  }

  async fetch(request) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    // Handle HTTP proxy requests
    if (!upgradeHeader && url.pathname.startsWith('/proxy/')) {
      return this.handleHttpProxy(request);
    }

    // Handle WebSocket connections
    const clientType = url.searchParams.get('type');

    // Upgrade to WebSocket
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket
    server.accept();

    if (clientType === 'bot-server') {
      // This is a bot server connecting
      const serverUrl = url.searchParams.get('serverUrl');
      console.log('Bot server connected, HTTP URL:', serverUrl);

      // If there's already a bot server, close it
      if (this.botServer) {
        this.botServer.close(1000, 'Replaced by new connection');
      }

      this.botServer = server;
      this.botServerUrl = serverUrl; // Store HTTP URL for proxying

      // Forward messages from bot server to all clients
      server.addEventListener('message', (event) => {
        for (const client of this.clients) {
          try {
            client.send(event.data);
          } catch (err) {
            console.error('Error sending to client:', err);
          }
        }
      });

      server.addEventListener('close', () => {
        console.log('Bot server disconnected');
        this.botServer = null;
        this.botServerUrl = null;
      });

    } else {
      // This is a frontend client connecting
      console.log('Client connected');

      this.clients.add(server);

      // Forward messages from client to bot server
      server.addEventListener('message', (event) => {
        if (this.botServer && this.botServer.readyState === 1) {
          try {
            this.botServer.send(event.data);
          } catch (err) {
            console.error('Error sending to bot server:', err);
          }
        } else {
          // Bot server not connected, send error
          server.send(JSON.stringify({ error: 'Bot server not connected' }));
        }
      });

      server.addEventListener('close', () => {
        console.log('Client disconnected');
        this.clients.delete(server);
      });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleHttpProxy(request) {
    if (!this.botServerUrl) {
      return new Response('Bot server not connected', {
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    try {
      // Extract the path after /proxy/
      const url = new URL(request.url);
      const proxyPath = url.pathname.replace('/proxy/', '/');
      const targetUrl = `${this.botServerUrl}${proxyPath}${url.search}`;

      console.log('Proxying HTTP request to:', targetUrl);

      // Forward the request to the bot server
      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await fetch(proxyRequest);

      // Add CORS headers to the response
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });

    } catch (error) {
      console.error('Error proxying HTTP request:', error);
      return new Response(`Proxy error: ${error.message}`, {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
}
