# vibe-app-tests

Automated tests for apps built with Lovable, Bolt or Cursor.

AI builders are fast, but a new feature often breaks an old one: login stops working,
saving fails, or a secret key ends up in the browser. Your users find out before you do.
This starter checks the flows that matter on every deploy, on desktop and on an Android-size screen.

## What it checks

| # | Test | Catches |
|---|---|---|
| 1 | Home page loads | JavaScript errors, broken requests |
| 2 | Sign up | New users can't create an account |
| 3 | Log in and log out | Login broken, wrong password accepted, logout not working |
| 4 | Protected page | Logged-out visitors can open private pages |
| 5 | Core feature | Data not saved, or gone after a reload |
| 6 | Secret scan | Stripe, Supabase `service_role` / `sb_secret_`, OpenAI, Anthropic, AWS keys or private keys in page HTML or JavaScript |

Every test runs twice, on desktop Chrome and a Pixel 7 screen, except sign-up: it runs once
per run, because each sign-up can send a confirmation email and those are rate-limited.

## Try it on the demo app

Needs Node 20.12+.

```bash
npm install
npx playwright install chromium
npm test
```

With no `BASE_URL`, the tests start the bundled demo app (`demo-app/server.js`) and all 13 pass (1 skipped: sign-up on the Pixel screen).

Now break the demo app the way real updates break apps, and watch the right test fail:

```bash
DEMO_BUG=auth npm test   # private page open to everyone -> tests 3 and 4 fail
DEMO_BUG=save npm test   # notes not saved -> test 5 fails
DEMO_BUG=leak npm test   # secret Stripe key in app.js -> test 6 fails
```

(PowerShell: `$env:DEMO_BUG="auth"; npm test`)

`npm run report` opens the HTML report with screenshots and traces of each failure.

## Use it on your app

1. Copy `.env.example` to `.env`. Set `BASE_URL` to a **preview or staging** URL and
   `TEST_EMAIL` / `TEST_PASSWORD` to a test account you made for this. Never a real user.
2. Edit `flows.config.ts`: page paths, button text, the text that shows only when logged in,
   and your core feature. This is the only file you change.
3. Run `npm test`.

Safety:

- The sign-up test creates a new account on every run (`vibe-test+<time>@example.com`).
  Point it at staging, or set `SIGNUP_EMAIL_DOMAIN` to a domain you own.
- Payments: use Stripe test mode only.
- Only run this on apps you own or have permission to test.

## Run on every deploy (GitHub Actions)

`.github/workflows/tests.yml` runs the tests on every push, pull request, and after each
successful deploy that reports a deployment status (Vercel and Netlify do). Add these repo secrets:

| Secret | Value |
|---|---|
| `BASE_URL` | Staging URL (used when the deploy does not report its own URL) |
| `TEST_EMAIL`, `TEST_PASSWORD` | The test account |
| `SIGNUP_EMAIL_DOMAIN` | Optional |

With no secrets set, the workflow tests the demo app. The HTML report is saved as a build artifact.

## Want this set up for you?

I set this up on Lovable / Bolt / Cursor apps, keep it running on every update and fix what
breaks. Free first run: 5 core flows tested on your app, with a short report.
Contact: [github.com/zeeshanqadir568](https://github.com/zeeshanqadir568)

## License

MIT
