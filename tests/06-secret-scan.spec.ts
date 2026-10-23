import { test, expect, type Page } from '@playwright/test';
import { flows } from '../flows.config';
import { logIn } from './helpers';

// Keys that must never reach the browser. Publishable / anon keys are public by design and are not listed.
const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Stripe secret key', regex: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}/g },
  { name: 'Supabase secret key', regex: /\bsb_secret_[0-9a-zA-Z_-]{16,}/g },
  { name: 'OpenAI API key', regex: /\bsk-(?:proj-)?[0-9a-zA-Z_-]{32,}/g },
  { name: 'Anthropic API key', regex: /\bsk-ant-[0-9a-zA-Z_-]{32,}/g },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const JWT = /\beyJ[0-9a-zA-Z_-]+\.eyJ[0-9a-zA-Z_-]+\.[0-9a-zA-Z_-]+/g;

// Supabase service_role keys are JWTs; the role is in the payload.
function isServiceRoleJwt(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

function mask(value: string) {
  return `${value.slice(0, 12)}...(${value.length} chars)`;
}

function scan(text: string, source: string) {
  const found: string[] = [];
  for (const { name, regex } of SECRET_PATTERNS) {
    for (const match of text.matchAll(regex)) found.push(`${name} in ${source}: ${mask(match[0])}`);
  }
  for (const match of text.matchAll(JWT)) {
    if (isServiceRoleJwt(match[0])) found.push(`Supabase service_role key in ${source}: ${mask(match[0])}`);
  }
  return found;
}

async function collectPage(page: Page, path: string, sources: Map<string, string>) {
  const scripts: Promise<void>[] = [];
  const onResponse = (res: import('@playwright/test').Response) => {
    const type = res.request().resourceType();
    if (type === 'script' || type === 'document') {
      scripts.push(
        res.text().then(
          (body) => void sources.set(res.url(), body),
          () => undefined,
        ),
      );
    }
  };
  page.on('response', onResponse);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  page.off('response', onResponse);
  await Promise.all(scripts);
}

test('no secret keys in the page HTML or JavaScript', async ({ page }) => {
  const sources = new Map<string, string>();

  for (const path of flows.secretScanPaths) await collectPage(page, path, sources);
  await logIn(page);
  await collectPage(page, flows.paths.protected, sources);

  expect(sources.size, 'pages and scripts scanned').toBeGreaterThan(0);
  const leaks = [...sources].flatMap(([url, body]) => scan(body, url));
  expect(leaks, 'secret keys visible to every visitor').toEqual([]);
});
