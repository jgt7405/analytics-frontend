# Frontend Testing Guide

Jest testing suite for the Next.js sports analytics application. Tests validate:
- API client refactoring (split api.ts into domain modules)
- Hook functionality with refactored API
- Backward compatibility of legacy exports

## Setup

Tests are configured in `jest.config.js` with Next.js integration.

**Install test dependencies:**
```bash
npm install
```

## Running Tests

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm test:watch
```

**Run with coverage report:**
```bash
npm test:coverage
```

**Run specific test file:**
```bash
npm test -- api.test.ts
```

## Test Structure

### API Client Tests (`src/services/__tests__/`)

#### `api.test.ts` - Export & Interface Tests
- ✅ ApiClient class is exported
- ✅ api singleton instance exists
- ✅ All basketball methods are exported
- ✅ All football methods are exported
- ✅ Legacy compatibility functions are exported
- ✅ ApiClient extends BasketballApiClient (inheritance chain)

#### `api.integration.test.ts` - Integration Tests
- ✅ Basketball endpoints call correct URLs
- ✅ Football endpoints call correct URLs
- ✅ Season parameters are passed correctly
- ✅ Legacy standalone functions work
- ✅ Fetch is called with correct headers and options

### Hook Tests (`src/hooks/__tests__/`)

#### `useStandings.test.ts`
- ✅ Hook is importable
- ✅ Hook uses api.getStandings

## What's Tested

### API Client Refactoring Validation
The primary goal is to validate that splitting `api.ts` (937 lines) into:
- `shared-request.ts` (BaseApiClient infrastructure)
- `basketball-api.ts` (BasketballApiClient)
- `football-api.ts` (ApiClient with football methods)
- `api.ts` (thin re-exports)

...maintains 100% backward compatibility with 18 existing hook imports.

### Coverage

**Basketball Methods (9 total):**
- getStandings ✅
- getCWV ✅
- getSchedule ✅
- getTWV ✅
- getConfTourney ✅
- getNCAATourney ✅
- getSeedData ✅
- getTeamData ✅
- getUnifiedConferenceData ✅

**Football Methods (11 total):**
- getFootballStandings ✅
- getFootballSchedule ✅
- getFootballTWV ✅
- getFootballCWV ✅
- getFootballPlayoffs ✅
- getFootballConfChamp ✅
- getFootballSeed ✅
- getCFP ✅
- getFootballTeams ✅
- getFootballConfData ✅
- getFootballTeam ✅

**Legacy Compatibility Functions (4 total):**
- getConfScheduleData ✅
- getStandingsData ✅
- getCWVData ✅

## Test Results

Current status: All API export and integration tests passing.

Run `npm test` to verify the full suite.

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
- name: Run frontend tests
  run: |
    cd 05.29.2025Web/sports-analytics
    npm install
    npm test -- --coverage
```

## Notes

- Tests use Jest 29.7.0 with Next.js integration
- Mock fetch for API calls (no network requests)
- Mocked next/router and next/image
- All 18 importing hooks should pass without modification

## Next Steps

1. ✅ API export tests (completed)
2. ✅ API integration tests (completed)
3. Add React Query integration tests
4. Add hook render tests with providers
5. Add end-to-end tests with MSW (Mock Service Worker)
