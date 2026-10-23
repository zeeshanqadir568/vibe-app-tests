// The only file you edit per app. Defaults match the demo app and the most
// common wording in Lovable / Bolt / Supabase starter apps.

export type AfterSignup = 'loggedIn' | 'confirmEmail';

export const flows = {
  paths: {
    home: '/',
    signup: '/signup',
    login: '/login',
    // A page only logged-in users may see.
    protected: '/dashboard',
  },

  // What the app does right after sign up:
  // 'loggedIn' = user lands inside the app, 'confirmEmail' = "check your email" screen.
  afterSignup: 'loggedIn' as AfterSignup,

  labels: {
    email: /email/i,
    password: /password/i,
  },

  buttons: {
    signup: /sign up|create account|register/i,
    login: /^(log ?in|sign ?in)$/i,
    logout: /log ?out|sign ?out/i,
  },

  // Text that is only on screen when someone is logged in.
  loggedInMarker: /signed in as/i,
  confirmEmailMarker: /check your email|confirm your email/i,

  // The one thing users come to the app for: create something and see it again after a reload.
  coreFeature: {
    path: '/dashboard',
    input: /new note/i,
    submit: /add note/i,
  },

  // Pages whose HTML and JavaScript are scanned for leaked secret keys.
  // The protected page is scanned after logging in.
  secretScanPaths: ['/', '/login', '/signup'],
};
