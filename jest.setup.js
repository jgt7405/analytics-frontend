// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom doesn't implement AbortSignal.timeout (every real browser does).
// shared-request.ts passes it to fetch on every request, so without this the
// API tests throw before fetch is even called and burn the retry backoff.
if (typeof AbortSignal !== 'undefined' && !AbortSignal.timeout) {
  AbortSignal.timeout = (ms) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new Error('TimeoutError')), ms)
    return controller.signal
  }
}

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false,
    }
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))
