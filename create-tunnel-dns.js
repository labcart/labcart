// Script to create DNS record for named tunnel
// Usage: node create-tunnel-dns.js <subdomain> <tunnelId>

const subdomain = process.argv[2];
const tunnelId = process.argv[3];

if (!subdomain || !tunnelId) {
  console.error('Usage: node create-tunnel-dns.js <subdomain> <tunnelId>');
  process.exit(1);
}

async function createDNSRecord() {
  // Get Zone ID for labcart.io
  const zonesResp = await fetch('https://api.cloudflare.com/client/v4/zones?name=labcart.io', {
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
    }
  });

  const zonesData = await zonesResp.json();
  if (!zonesData.success || !zonesData.result[0]) {
    throw new Error('Could not find labcart.io zone');
  }

  const zoneId = zonesData.result[0].id;

  // Create CNAME record pointing to tunnel
  const dnsResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: subdomain,
      content: `${tunnelId}.cfargotunnel.com`,
      ttl: 1,
      proxied: true
    })
  });

  const dnsData = await dnsResp.json();

  if (!dnsData.success) {
    throw new Error(`DNS creation failed: ${JSON.stringify(dnsData.errors)}`);
  }

  console.log(JSON.stringify({
    success: true,
    hostname: `${subdomain}.labcart.io`,
    tunnelId: tunnelId
  }));
}

createDNSRecord().catch(err => {
  console.error(JSON.stringify({
    success: false,
    error: err.message
  }));
  process.exit(1);
});
