/**
 * Integration tests for API client
 * Tests actual API method behavior with mocked fetch
 */

import { api } from '../api'

// Mock fetch globally
global.fetch = jest.fn()

describe('API Client Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basketball Standings', () => {
    it('getStandings should call correct endpoint', async () => {
      const mockData = {
        data: [
          {
            team: 'Duke',
            wins: 25,
            losses: 5,
          },
        ],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      await api.getStandings('ACC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/standings/ACC/'),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      )
    })

    it('getCWV should call correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getCWV('ACC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/cwv/ACC/'),
        expect.any(Object)
      )
    })

    it('getSchedule should call correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getSchedule('ACC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/conf_schedule/ACC/'),
        expect.any(Object)
      )
    })
  })

  describe('Football Standings', () => {
    it('getFootballStandings should call correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getFootballStandings('SEC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/football/standings/SEC/'),
        expect.any(Object)
      )
    })

    it('getFootballCWV should call correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getFootballCWV('SEC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/football/cwv/SEC/'),
        expect.any(Object)
      )
    })

    it('getCFP should call correct endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getCFP('SEC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/cfp/SEC/'),
        expect.any(Object)
      )
    })
  })

  describe('Backward Compatible Legacy Exports', () => {
    it('getStandingsData should work as standalone function', async () => {
      const { getStandingsData } = require('../api')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await getStandingsData('ACC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proxy/standings/ACC/'),
        expect.any(Object)
      )
    })

    it('getCWVData should work as standalone function', async () => {
      const { getCWVData } = require('../api')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await getCWVData('ACC').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Season Parameter', () => {
    it('should pass season parameter correctly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getStandings('ACC', '2023').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/?season=2023'),
        expect.any(Object)
      )
    })

    it('should pass season parameter to football endpoints', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await api.getFootballStandings('SEC', '2023').catch(() => {})  // validation errors expected with mock data

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/?season=2023'),
        expect.any(Object)
      )
    })
  })
})
