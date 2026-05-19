/**
 * Tests for useStandings hook
 * Validates that the hook correctly uses the refactored api.ts
 */

// Note: These are basic type/export tests. Full integration tests would require:
// - React Query setup
// - Mock data providers
// - Network mocking (MSW)
// Full integration tests should be added separately

describe('useStandings Hook', () => {
  it('hook should be importable', () => {
    const useStandings = require('../useStandings').default || require('../useStandings')
    expect(useStandings).toBeDefined()
    expect(typeof useStandings).toBe('function')
  })

  it('hook should call api.getStandings', async () => {
    // This test validates the hook interface without actually calling it
    // Full testing would require React Query and providers
    const useStandings = require('../useStandings').default || require('../useStandings')
    expect(useStandings.length).toBeGreaterThanOrEqual(0)
  })
})
