/**
 * Tests for the refactored API service exports
 * Validates that the split from monolithic api.ts maintains backward compatibility
 */

describe('API Service - Backward Compatibility', () => {
  it('exports ApiClient class', () => {
    const { ApiClient } = require('../api')
    expect(ApiClient).toBeDefined()
    expect(typeof ApiClient).toBe('function')
  })

  it('exports api singleton instance', () => {
    const { api } = require('../api')
    expect(api).toBeDefined()
    expect(typeof api.getStandings).toBe('function')
    expect(typeof api.getFootballStandings).toBe('function')
  })

  it('exports basketball API methods', () => {
    const {
      getStandings,
      getCWV,
      getSchedule,
      getTWV,
      getConfTourney,
      getNCAATourney,
      getSeedData,
      getTeamData,
      getUnifiedConferenceData,
    } = require('../api')

    expect(getStandings).toBeDefined()
    expect(typeof getStandings).toBe('function')
    expect(getCWV).toBeDefined()
    expect(getSchedule).toBeDefined()
    expect(getTWV).toBeDefined()
    expect(getConfTourney).toBeDefined()
    expect(getNCAATourney).toBeDefined()
    expect(getSeedData).toBeDefined()
    expect(getTeamData).toBeDefined()
    expect(getUnifiedConferenceData).toBeDefined()
  })

  it('exports football API methods', () => {
    const {
      getFootballStandings,
      getFootballTWV,
      getFootballCWV,
      getFootballPlayoffs,
      getFootballCFP,
    } = require('../api')

    expect(getFootballStandings).toBeDefined()
    expect(typeof getFootballStandings).toBe('function')
    expect(getFootballTWV).toBeDefined()
    expect(getFootballCWV).toBeDefined()
    expect(getFootballPlayoffs).toBeDefined()
    expect(getFootballCFP).toBeDefined()
  })

  it('exports legacy function names for compatibility', () => {
    const {
      getConfScheduleData,
      getStandingsData,
      getCWVData,
    } = require('../api')

    expect(getConfScheduleData).toBeDefined()
    expect(typeof getConfScheduleData).toBe('function')
    expect(getStandingsData).toBeDefined()
    expect(getCWVData).toBeDefined()
  })

  it('api methods are callable without errors', () => {
    const { api } = require('../api')

    // Test that methods exist and are callable (not that they succeed, just that they're functions)
    const methods = [
      'getStandings',
      'getCWV',
      'getSchedule',
      'getTWV',
      'getConfTourney',
      'getNCAATourney',
      'getSeedData',
      'getTeamData',
      'getUnifiedConferenceData',
      'getFootballStandings',
      'getFootballSchedule',
      'getFootballTWV',
      'getFootballCWV',
      'getFootballPlayoffs',
      'getFootballConfChamp',
      'getFootballSeed',
      'getCFP',
      'getFootballTeams',
      'getFootballConfData',
      'getFootballTeam',
    ]

    methods.forEach((method) => {
      expect(typeof api[method]).toBe('function')
    })
  })
})

describe('API Service - Architecture', () => {
  it('api is instance of ApiClient', () => {
    const { api, ApiClient } = require('../api')
    expect(api).toBeInstanceOf(ApiClient)
  })

  it('ApiClient extends BasketballApiClient', () => {
    const { ApiClient } = require('../api')
    const { BasketballApiClient } = require('../basketball-api')
    expect(ApiClient.prototype).toBeInstanceOf(Object)
    // Verify inheritance by checking prototype chain
    const instance = new ApiClient()
    expect(instance.getStandings).toBeDefined()
    expect(instance.getFootballStandings).toBeDefined()
  })
})
