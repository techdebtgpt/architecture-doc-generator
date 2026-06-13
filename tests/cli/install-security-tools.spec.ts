/**
 * Tests for install-security-tools (status only; no real installs).
 * Install functions are integration-tested manually (they spawn brew/pip).
 */

import { isToolAvailable } from '../../cli/utils/install-security-tools';

describe('install-security-tools', () => {
  describe('isToolAvailable', () => {
    it('returns an object with available and optional version', async () => {
      const result = await isToolAvailable('semgrep');
      expect(result).toMatchObject({ available: expect.any(Boolean) });
      if (result.available) {
        expect(result.version).toBeDefined();
        expect(typeof result.version).toBe('string');
      }
    });

    it('returns same shape for trivy', async () => {
      const result = await isToolAvailable('trivy');
      expect(result).toMatchObject({ available: expect.any(Boolean) });
      if (result.available) {
        expect(result.version).toBeDefined();
      }
    });

    it('does not throw for either tool', async () => {
      await expect(isToolAvailable('semgrep')).resolves.toBeDefined();
      await expect(isToolAvailable('trivy')).resolves.toBeDefined();
    });
  });
});
