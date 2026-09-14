/**
 * A deliberately simple, dependency-free strength estimate. This is NOT a
 * substitute for a real estimator like zxcvbn — it doesn't know about
 * common passwords, dictionary words, or keyboard patterns. It only checks
 * length and character variety, which is enough to catch obviously weak
 * passphrases ("password", "1234") without pulling in a large WASM/JS
 * dependency. If you want stronger estimation later, zxcvbn-ts runs
 * entirely client-side and could be dropped in here.
 */

export type StrengthLevel = 'too-weak' | 'weak' | 'ok' | 'strong';

export interface StrengthResult {
  level: StrengthLevel;
  score: 0 | 1 | 2 | 3; // for the 3-segment meter in the UI
  message: string;
}

export function estimatePassphraseStrength(passphrase: string): StrengthResult {
  const length = passphrase.length;

  if (length === 0) {
    return { level: 'too-weak', score: 0, message: '' };
  }

  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasDigit = /[0-9]/.test(passphrase);
  const hasSymbol = /[^a-zA-Z0-9]/.test(passphrase);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  // A long passphrase of just lowercase words ("correct horse battery
  // staple") is genuinely stronger than a short complex one, so length
  // dominates the score rather than character-class box-ticking.
  if (length < 10) {
    return {
      level: 'too-weak',
      score: 0,
      message: 'Too short — use at least 10 characters, longer if possible.'
    };
  }

  if (length < 14 && variety < 3) {
    return {
      level: 'weak',
      score: 1,
      message: 'Weak — add more length or mix in numbers/symbols.'
    };
  }

  if (length < 20) {
    return {
      level: 'ok',
      score: 2,
      message: 'Reasonable. Longer is still better for a financial vault.'
    };
  }

  return {
    level: 'strong',
    score: 3,
    message: 'Strong.'
  };
}
