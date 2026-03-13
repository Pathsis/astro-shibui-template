// Bootstrap script to enable proxy support for Astro build process using undici
import { setGlobalDispatcher, ProxyAgent } from 'undici';

const proxyUrl = process.env.GLOBAL_AGENT_HTTP_PROXY || 'http://127.0.0.1:9910';
console.error('[proxy-bootstrap] Setting undici global proxy to:', proxyUrl);

try {
  const agent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(agent);
  console.error('[proxy-bootstrap] Undici proxy agent configured successfully');
} catch (error) {
  console.error('[proxy-bootstrap] Failed to set proxy agent:', error.message);
}


