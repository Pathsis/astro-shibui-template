import { build } from 'astro';

build({
  root: '.',
}).catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
