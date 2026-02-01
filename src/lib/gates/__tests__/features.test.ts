import { describe, it, expect } from 'vitest';
import { canAccess, canCreateBracket, canCreateLiveBracket, canCreateDraftBracket, canUseBracketType, canUseEntrantCount } from '../features';

// ─── canAccess() ─────────────────────────────────────────────────────────────

describe('canAccess', () => {
  // Free tier: boolean features that are false
  it('free tier cannot access csvExport', () => {
    const result = canAccess('free', 'csvExport');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  it('free tier can access basicAnalytics', () => {
    const result = canAccess('free', 'basicAnalytics');
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot access sports integration (upgrade target is pro_plus, not pro)', () => {
    const result = canAccess('free', 'sportsIntegration');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  it('free tier cannot access CSV upload', () => {
    const result = canAccess('free', 'csvUpload');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  it('free tier cannot access live event mode', () => {
    const result = canAccess('free', 'liveEventMode');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  // Pro tier: has csvExport and csvUpload, but not sportsIntegration
  it('pro tier can access csvExport', () => {
    const result = canAccess('pro', 'csvExport');
    expect(result.allowed).toBe(true);
    expect(result.upgradeTarget).toBeUndefined();
  });

  it('pro tier cannot access sports integration', () => {
    const result = canAccess('pro', 'sportsIntegration');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  it('pro tier can access CSV upload', () => {
    const result = canAccess('pro', 'csvUpload');
    expect(result.allowed).toBe(true);
  });

  it('pro tier can access live event mode', () => {
    const result = canAccess('pro', 'liveEventMode');
    expect(result.allowed).toBe(true);
  });

  // Pro Plus tier: has everything
  it('pro_plus tier can access sports integration', () => {
    const result = canAccess('pro_plus', 'sportsIntegration');
    expect(result.allowed).toBe(true);
  });

  it('pro_plus tier can access csvExport', () => {
    const result = canAccess('pro_plus', 'csvExport');
    expect(result.allowed).toBe(true);
  });

  it('pro_plus tier can access basicAnalytics', () => {
    const result = canAccess('pro_plus', 'basicAnalytics');
    expect(result.allowed).toBe(true);
  });

  // Non-boolean features always return allowed: true via canAccess
  it('free tier canAccess returns allowed for numeric features (maxBrackets)', () => {
    const result = canAccess('free', 'maxBrackets');
    expect(result.allowed).toBe(true);
  });

  it('free tier canAccess returns allowed for array features (bracketTypes)', () => {
    const result = canAccess('free', 'bracketTypes');
    expect(result.allowed).toBe(true);
  });

  // Reason message includes feature name and target tier
  it('includes descriptive reason when access denied', () => {
    const result = canAccess('free', 'csvExport');
    expect(result.reason).toContain('csvExport');
    expect(result.reason).toContain('pro');
  });
});

// ─── canCreateBracket() ─────────────────────────────────────────────────────

describe('canCreateBracket', () => {
  // Free tier: maxBrackets = 3
  it('free tier can create bracket when at 0', () => {
    const result = canCreateBracket('free', 0);
    expect(result.allowed).toBe(true);
  });

  it('free tier can create bracket when at 2', () => {
    const result = canCreateBracket('free', 2);
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot create 4th bracket (at limit of 3)', () => {
    const result = canCreateBracket('free', 3);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  it('free tier cannot create bracket when over limit', () => {
    const result = canCreateBracket('free', 5);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  // Pro tier: maxBrackets = 25
  it('pro tier can create bracket when at 24', () => {
    const result = canCreateBracket('pro', 24);
    expect(result.allowed).toBe(true);
  });

  it('pro tier cannot create 26th bracket (at limit of 25)', () => {
    const result = canCreateBracket('pro', 25);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Pro Plus tier: maxBrackets = Infinity
  it('pro_plus tier can create bracket at any count', () => {
    const result = canCreateBracket('pro_plus', 1000);
    expect(result.allowed).toBe(true);
  });

  it('pro_plus tier can create bracket at very high count', () => {
    const result = canCreateBracket('pro_plus', 999999);
    expect(result.allowed).toBe(true);
  });

  // Reason message
  it('includes bracket limit in reason when denied', () => {
    const result = canCreateBracket('free', 3);
    expect(result.reason).toContain('3');
    expect(result.reason).toContain('pro');
  });
});

// ─── canUseBracketType() ────────────────────────────────────────────────────

describe('canUseBracketType', () => {
  // Free tier: only single_elimination
  it('free tier can use single_elimination', () => {
    const result = canUseBracketType('free', 'single_elimination');
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot use double_elimination (upgrade to pro)', () => {
    const result = canUseBracketType('free', 'double_elimination');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  it('free tier cannot use predictive (upgrade to pro_plus, skipping pro)', () => {
    const result = canUseBracketType('free', 'predictive');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  it('free tier cannot use round_robin (upgrade to pro)', () => {
    const result = canUseBracketType('free', 'round_robin');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  // Pro tier: single_elimination, double_elimination, round_robin
  it('pro tier can use round_robin', () => {
    const result = canUseBracketType('pro', 'round_robin');
    expect(result.allowed).toBe(true);
  });

  it('pro tier can use double_elimination', () => {
    const result = canUseBracketType('pro', 'double_elimination');
    expect(result.allowed).toBe(true);
  });

  it('pro tier cannot use predictive (upgrade to pro_plus)', () => {
    const result = canUseBracketType('pro', 'predictive');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Pro Plus tier: all types including predictive
  it('pro_plus tier can use predictive', () => {
    const result = canUseBracketType('pro_plus', 'predictive');
    expect(result.allowed).toBe(true);
  });

  it('pro_plus tier can use all standard types', () => {
    expect(canUseBracketType('pro_plus', 'single_elimination').allowed).toBe(true);
    expect(canUseBracketType('pro_plus', 'double_elimination').allowed).toBe(true);
    expect(canUseBracketType('pro_plus', 'round_robin').allowed).toBe(true);
  });

  // Unknown bracket type
  it('unknown bracket type is denied for any tier', () => {
    const result = canUseBracketType('pro_plus', 'swiss_system');
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });
});

// ─── canUseEntrantCount() ───────────────────────────────────────────────────

describe('canUseEntrantCount', () => {
  // Free tier: maxEntrantsPerBracket = 16
  it('free tier can use 16 entrants (at limit)', () => {
    const result = canUseEntrantCount('free', 16);
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot use 17 entrants (over limit)', () => {
    const result = canUseEntrantCount('free', 17);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  it('free tier can use 1 entrant', () => {
    const result = canUseEntrantCount('free', 1);
    expect(result.allowed).toBe(true);
  });

  // Pro tier: maxEntrantsPerBracket = 64
  it('pro tier can use 64 entrants (at limit)', () => {
    const result = canUseEntrantCount('pro', 64);
    expect(result.allowed).toBe(true);
  });

  it('pro tier cannot use 65 entrants (over limit)', () => {
    const result = canUseEntrantCount('pro', 65);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Pro Plus tier: maxEntrantsPerBracket = 128
  it('pro_plus tier can use 128 entrants (at limit)', () => {
    const result = canUseEntrantCount('pro_plus', 128);
    expect(result.allowed).toBe(true);
  });

  it('pro_plus tier cannot use 129 entrants (over limit)', () => {
    const result = canUseEntrantCount('pro_plus', 129);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Reason message
  it('includes entrant limit in reason when denied', () => {
    const result = canUseEntrantCount('free', 20);
    expect(result.reason).toContain('16');
    expect(result.reason).toContain('pro');
  });
});

// ─── canCreateLiveBracket() ─────────────────────────────────────────────────

describe('canCreateLiveBracket', () => {
  // Free tier: maxLiveBrackets = 2
  it('free tier can create live bracket when at 0', () => {
    const result = canCreateLiveBracket('free', 0);
    expect(result.allowed).toBe(true);
  });

  it('free tier can create live bracket when at 1', () => {
    const result = canCreateLiveBracket('free', 1);
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot create 3rd live bracket (at limit of 2)', () => {
    const result = canCreateLiveBracket('free', 2);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  // Pro tier: maxLiveBrackets = 10
  it('pro tier can create live bracket when at 9', () => {
    const result = canCreateLiveBracket('pro', 9);
    expect(result.allowed).toBe(true);
  });

  it('pro tier cannot create 11th live bracket (at limit of 10)', () => {
    const result = canCreateLiveBracket('pro', 10);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Pro Plus tier: maxLiveBrackets = Infinity
  it('pro_plus tier can create live bracket at any count', () => {
    const result = canCreateLiveBracket('pro_plus', 1000);
    expect(result.allowed).toBe(true);
  });

  // Reason message
  it('includes live bracket limit in reason when denied', () => {
    const result = canCreateLiveBracket('free', 2);
    expect(result.reason).toContain('2');
    expect(result.reason).toContain('pro');
  });
});

// ─── canCreateDraftBracket() ────────────────────────────────────────────────

describe('canCreateDraftBracket', () => {
  // Free tier: maxDraftBrackets = 2
  it('free tier can create draft bracket when at 0', () => {
    const result = canCreateDraftBracket('free', 0);
    expect(result.allowed).toBe(true);
  });

  it('free tier can create draft bracket when at 1', () => {
    const result = canCreateDraftBracket('free', 1);
    expect(result.allowed).toBe(true);
  });

  it('free tier cannot create 3rd draft bracket (at limit of 2)', () => {
    const result = canCreateDraftBracket('free', 2);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro');
  });

  // Pro tier: maxDraftBrackets = 15
  it('pro tier can create draft bracket when at 14', () => {
    const result = canCreateDraftBracket('pro', 14);
    expect(result.allowed).toBe(true);
  });

  it('pro tier cannot create 16th draft bracket (at limit of 15)', () => {
    const result = canCreateDraftBracket('pro', 15);
    expect(result.allowed).toBe(false);
    expect(result.upgradeTarget).toBe('pro_plus');
  });

  // Pro Plus tier: maxDraftBrackets = Infinity
  it('pro_plus tier can create draft bracket at any count', () => {
    const result = canCreateDraftBracket('pro_plus', 1000);
    expect(result.allowed).toBe(true);
  });

  // Reason message
  it('includes draft bracket limit in reason when denied', () => {
    const result = canCreateDraftBracket('free', 2);
    expect(result.reason).toContain('2');
    expect(result.reason).toContain('pro');
  });
});
