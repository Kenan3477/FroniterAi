"""
Testing Generator Module

Generates comprehensive test suites for web applications including:
- Unit tests
- Integration tests
- End-to-end tests
- Performance tests
- Accessibility tests
- Security tests
"""

import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class TestType(Enum):
    UNIT = "unit"
    INTEGRATION = "integration"
    E2E = "e2e"
    PERFORMANCE = "performance"
    ACCESSIBILITY = "accessibility"
    SECURITY = "security"
    VISUAL_REGRESSION = "visual_regression"
    API = "api"

class TestFramework(Enum):
    JEST = "jest"
    VITEST = "vitest"
    CYPRESS = "cypress"
    PLAYWRIGHT = "playwright"
    TESTING_LIBRARY = "testing_library"
    STORYBOOK = "storybook"

@dataclass
class TestConfiguration:
    """Test configuration for specific test type"""
    test_type: TestType
    framework: TestFramework
    config_file: str
    test_files: Dict[str, str]
    setup_files: Dict[str, str]
    commands: Dict[str, str]

class TestingGenerator:
    """
    Comprehensive testing generator that creates:
    - Unit tests for components and utilities
    - Integration tests for API endpoints and workflows
    - End-to-end tests for user journeys
    - Performance tests for Core Web Vitals
    - Accessibility tests for WCAG compliance
    - Security tests for common vulnerabilities
    - Visual regression tests for UI consistency
    """
    
    def __init__(self):
        self.test_frameworks = self._initialize_test_frameworks()
        self.test_patterns = self._initialize_test_patterns()
        
    async def generate_test_suite(self, requirements) -> Dict[str, str]:
        """Generate comprehensive test suite based on requirements"""
        test_files = {}
        
        # Generate test configurations
        test_configs = self._determine_test_configurations(requirements)
        
        for config in test_configs:
            # Generate configuration files
            test_files.update(config.config_file)
            
            # Generate test files
            test_files.update(config.test_files)
            
            # Generate setup files
            test_files.update(config.setup_files)
        
        # Generate additional test utilities
        test_files.update(self._generate_test_utilities(requirements))
        
        # Generate CI/CD test configurations
        test_files.update(self._generate_ci_test_configs(requirements))
        
        return test_files
    
    def _determine_test_configurations(self, requirements) -> List[TestConfiguration]:
        """Determine test configurations based on requirements"""
        configurations = []
        
        # Unit tests
        if requirements.testing_strategy.get("unit_tests", True):
            configurations.append(self._generate_unit_test_config(requirements))
        
        # Integration tests
        if requirements.testing_strategy.get("integration_tests", True):
            configurations.append(self._generate_integration_test_config(requirements))
        
        # E2E tests
        if requirements.testing_strategy.get("e2e_tests", True):
            configurations.append(self._generate_e2e_test_config(requirements))
        
        # Performance tests
        if requirements.testing_strategy.get("performance_tests", False):
            configurations.append(self._generate_performance_test_config(requirements))
        
        # Accessibility tests
        if requirements.testing_strategy.get("accessibility_tests", True):
            configurations.append(self._generate_accessibility_test_config(requirements))
        
        # Security tests
        if requirements.testing_strategy.get("security_tests", True):
            configurations.append(self._generate_security_test_config(requirements))
        
        return configurations
    
    def _generate_unit_test_config(self, requirements) -> TestConfiguration:
        """Generate unit test configuration"""
        framework = TestFramework.JEST if "react" in requirements.tech_stack.value else TestFramework.VITEST
        
        config_file = self._generate_jest_config(requirements) if framework == TestFramework.JEST else self._generate_vitest_config(requirements)
        
        test_files = {
            "src/components/__tests__/Button.test.tsx": self._generate_component_test("Button", requirements),
            "src/components/__tests__/Modal.test.tsx": self._generate_component_test("Modal", requirements),
            "src/utils/__tests__/auth.test.ts": self._generate_utility_test("auth", requirements),
            "src/utils/__tests__/api.test.ts": self._generate_utility_test("api", requirements),
            "src/hooks/__tests__/useAuth.test.ts": self._generate_hook_test("useAuth", requirements)
        }
        
        setup_files = {
            "src/test-utils/setup.ts": self._generate_test_setup(requirements),
            "src/test-utils/mocks.ts": self._generate_test_mocks(requirements),
            "src/test-utils/render.tsx": self._generate_test_render_utility(requirements)
        }
        
        commands = {
            "test": "jest" if framework == TestFramework.JEST else "vitest",
            "test:watch": "jest --watch" if framework == TestFramework.JEST else "vitest --watch",
            "test:coverage": "jest --coverage" if framework == TestFramework.JEST else "vitest --coverage"
        }
        
        return TestConfiguration(
            test_type=TestType.UNIT,
            framework=framework,
            config_file={"jest.config.js" if framework == TestFramework.JEST else "vitest.config.ts": config_file},
            test_files=test_files,
            setup_files=setup_files,
            commands=commands
        )
    
    def _generate_jest_config(self, requirements) -> str:
        """Generate Jest configuration"""
        return '''module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 10000,
}'''
    
    def _generate_component_test(self, component_name: str, requirements) -> str:
        """Generate component test"""
        return f'''import {{ render, screen, fireEvent, waitFor }} from '@testing-library/react'
import {{ {component_name} }} from '../{component_name}'
import {{ renderWithProviders }} from '../../test-utils/render'

describe('{component_name}', () => {{
  it('renders correctly', () => {{
    render(<{component_name}>Test</{component_name}>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  }})

  it('handles click events', async () => {{
    const handleClick = jest.fn()
    render(<{component_name} onClick={{handleClick}}>Click me</{component_name}>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  }})

  it('applies custom className', () => {{
    const customClass = 'custom-class'
    render(<{component_name} className={{customClass}}>Test</{component_name}>)
    
    expect(screen.getByText('Test')).toHaveClass(customClass)
  }})

  it('is accessible', () => {{
    render(<{component_name}>Accessible button</{component_name}>)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAccessibleName('Accessible button')
  }})

  describe('variants', () => {{
    it('renders primary variant', () => {{
      render(<{component_name} variant="primary">Primary</{component_name}>)
      expect(screen.getByText('Primary')).toHaveClass('btn-primary')
    }})

    it('renders secondary variant', () => {{
      render(<{component_name} variant="secondary">Secondary</{component_name}>)
      expect(screen.getByText('Secondary')).toHaveClass('btn-secondary')
    }})
  }})

  describe('states', () => {{
    it('shows loading state', () => {{
      render(<{component_name} loading>Loading</{component_name}>)
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    }})

    it('shows disabled state', () => {{
      render(<{component_name} disabled>Disabled</{component_name}>)
      expect(screen.getByRole('button')).toBeDisabled()
    }})
  }})
}})'''
    
    def _generate_e2e_test_config(self, requirements) -> TestConfiguration:
        """Generate E2E test configuration"""
        framework = TestFramework.PLAYWRIGHT  # Modern choice for E2E
        
        config_file = self._generate_playwright_config(requirements)
        
        test_files = {
            "e2e/auth.spec.ts": self._generate_auth_e2e_test(requirements),
            "e2e/homepage.spec.ts": self._generate_homepage_e2e_test(requirements),
            "e2e/user-journey.spec.ts": self._generate_user_journey_test(requirements)
        }
        
        if requirements.authentication:
            test_files["e2e/login.spec.ts"] = self._generate_login_e2e_test(requirements)
        
        if "ecommerce" in requirements.features:
            test_files["e2e/checkout.spec.ts"] = self._generate_checkout_e2e_test(requirements)
        
        setup_files = {
            "e2e/fixtures/auth.ts": self._generate_auth_fixtures(requirements),
            "e2e/utils/helpers.ts": self._generate_e2e_helpers(requirements)
        }
        
        commands = {
            "test:e2e": "playwright test",
            "test:e2e:headed": "playwright test --headed",
            "test:e2e:debug": "playwright test --debug"
        }
        
        return TestConfiguration(
            test_type=TestType.E2E,
            framework=framework,
            config_file={"playwright.config.ts": config_file},
            test_files=test_files,
            setup_files=setup_files,
            commands=commands
        )
    
    def _generate_playwright_config(self, requirements) -> str:
        """Generate Playwright configuration"""
        return f'''import {{ defineConfig, devices }} from '@playwright/test'

export default defineConfig({{
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', {{ outputFile: 'test-results/results.json' }}],
    ['junit', {{ outputFile: 'test-results/results.xml' }}]
  ],
  use: {{
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  }},
  projects: [
    {{
      name: 'chromium',
      use: {{ ...devices['Desktop Chrome'] }},
    }},
    {{
      name: 'firefox',
      use: {{ ...devices['Desktop Firefox'] }},
    }},
    {{
      name: 'webkit',
      use: {{ ...devices['Desktop Safari'] }},
    }},
    {{
      name: 'Mobile Chrome',
      use: {{ ...devices['Pixel 5'] }},
    }},
    {{
      name: 'Mobile Safari',
      use: {{ ...devices['iPhone 12'] }},
    }},
  ],
  webServer: {{
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  }},
}})'''
    
    def _generate_auth_e2e_test(self, requirements) -> str:
        """Generate authentication E2E test"""
        return '''import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can sign up with valid credentials', async ({ page }) => {
    await page.click('[data-testid="sign-up-button"]')
    
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!')
    
    await page.click('[data-testid="submit-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()
  })

  test('user can log in with valid credentials', async ({ page }) => {
    await page.click('[data-testid="log-in-button"]')
    
    await page.fill('[data-testid="email-input"]', 'existing@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    await page.click('[data-testid="submit-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.click('[data-testid="log-in-button"]')
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    await page.click('[data-testid="submit-button"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
  })

  test('user can log out', async ({ page }) => {
    // First log in
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'existing@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="submit-button"]')
    
    // Then log out
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    await expect(page).toHaveURL('/')
    await expect(page.locator('[data-testid="log-in-button"]')).toBeVisible()
  })

  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/dashboard')
    
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })
})'''
    
    def _generate_accessibility_test_config(self, requirements) -> TestConfiguration:
        """Generate accessibility test configuration"""
        test_files = {
            "src/__tests__/accessibility.test.ts": self._generate_accessibility_tests(requirements),
            "e2e/accessibility.spec.ts": self._generate_e2e_accessibility_tests(requirements)
        }
        
        setup_files = {
            "src/test-utils/accessibility-setup.ts": self._generate_accessibility_setup()
        }
        
        commands = {
            "test:a11y": "jest --testPathPattern=accessibility",
            "test:a11y:e2e": "playwright test accessibility.spec.ts"
        }
        
        return TestConfiguration(
            test_type=TestType.ACCESSIBILITY,
            framework=TestFramework.JEST,
            config_file={},
            test_files=test_files,
            setup_files=setup_files,
            commands=commands
        )
    
    def _generate_accessibility_tests(self, requirements) -> str:
        """Generate accessibility tests"""
        return '''import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Form } from '../components/Form'

expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  test('Button component has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('Modal component has proper accessibility attributes', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <h2>Modal Title</h2>
        <p>Modal content</p>
      </Modal>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
    
    // Check specific ARIA attributes
    const modal = container.querySelector('[role="dialog"]')
    expect(modal).toHaveAttribute('aria-labelledby')
    expect(modal).toHaveAttribute('aria-modal', 'true')
  })

  test('Form has proper labels and error messages', async () => {
    const { container } = render(
      <Form>
        <input type="email" id="email" aria-describedby="email-error" />
        <label htmlFor="email">Email Address</label>
        <div id="email-error" role="alert">Please enter a valid email</div>
      </Form>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('Navigation has proper keyboard navigation', async () => {
    const { container } = render(
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('Color contrast meets WCAG AA standards', async () => {
    const { container } = render(
      <div style={{ backgroundColor: '#ffffff', color: '#000000' }}>
        High contrast text
      </div>
    )
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
    expect(results).toHaveNoViolations()
  })

  test('Images have alt text', async () => {
    const { container } = render(
      <div>
        <img src="/test-image.jpg" alt="Descriptive alt text" />
        <img src="/decorative-image.jpg" alt="" role="presentation" />
      </div>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})'''
    
    def _generate_performance_test_config(self, requirements) -> TestConfiguration:
        """Generate performance test configuration"""
        test_files = {
            "performance/lighthouse.test.js": self._generate_lighthouse_tests(requirements),
            "performance/load-test.js": self._generate_load_tests(requirements),
            "performance/core-web-vitals.spec.ts": self._generate_core_web_vitals_tests(requirements)
        }
        
        setup_files = {
            "performance/config.js": self._generate_performance_config(),
            "performance/utils.js": self._generate_performance_utils()
        }
        
        commands = {
            "test:performance": "node performance/lighthouse.test.js",
            "test:load": "k6 run performance/load-test.js",
            "test:vitals": "playwright test performance/core-web-vitals.spec.ts"
        }
        
        return TestConfiguration(
            test_type=TestType.PERFORMANCE,
            framework=TestFramework.PLAYWRIGHT,
            config_file={},
            test_files=test_files,
            setup_files=setup_files,
            commands=commands
        )
    
    def _generate_lighthouse_tests(self, requirements) -> str:
        """Generate Lighthouse performance tests"""
        return f'''const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')

async function runLighthouse(url) {{
  const chrome = await chromeLauncher.launch({{ chromeFlags: ['--headless'] }})
  const options = {{
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  }}
  
  const runnerResult = await lighthouse(url, options)
  await chrome.kill()
  
  return runnerResult
}}

describe('{requirements.name} Performance Tests', () => {{
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  
  test('Homepage meets performance thresholds', async () => {{
    const result = await runLighthouse(baseUrl)
    const {{ lhr }} = result
    
    // Performance thresholds
    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9)
    expect(lhr.audits['first-contentful-paint'].numericValue).toBeLessThan(1800)
    expect(lhr.audits['largest-contentful-paint'].numericValue).toBeLessThan(2500)
    expect(lhr.audits['cumulative-layout-shift'].numericValue).toBeLessThan(0.1)
    
    // Accessibility
    expect(lhr.categories.accessibility.score).toBeGreaterThanOrEqual(0.95)
    
    // Best Practices
    expect(lhr.categories['best-practices'].score).toBeGreaterThanOrEqual(0.9)
    
    // SEO
    expect(lhr.categories.seo.score).toBeGreaterThanOrEqual(0.9)
  }}, 60000)
  
  test('Product page performance', async () => {{
    const result = await runLighthouse(`${{baseUrl}}/products/sample`)
    const {{ lhr }} = result
    
    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.85)
    expect(lhr.audits['time-to-interactive'].numericValue).toBeLessThan(3800)
  }}, 60000)
  
  test('Mobile performance', async () => {{
    const chrome = await chromeLauncher.launch({{ chromeFlags: ['--headless'] }})
    const options = {{
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port,
      formFactor: 'mobile',
      screenEmulation: {{
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
      }},
      throttlingMethod: 'simulate',
      throttling: {{
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      }},
    }}
    
    const result = await lighthouse(baseUrl, options)
    await chrome.kill()
    
    const {{ lhr }} = result
    expect(lhr.categories.performance.score).toBeGreaterThanOrEqual(0.8)
  }}, 60000)
}})'''
    
    def _generate_test_utilities(self, requirements) -> Dict[str, str]:
        """Generate test utilities"""
        utilities = {}
        
        # Test setup utility
        utilities["src/test-utils/setup.ts"] = '''import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})'''
        
        # Mock factory
        utilities["src/test-utils/mocks.ts"] = '''// API mocks
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay)
  })
}

// User mock
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
}

// Authentication mocks
export const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null,
}

// Router mocks
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Local storage mock
export const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock'''
        
        return utilities
    
    def _initialize_test_frameworks(self) -> Dict[str, Dict[str, Any]]:
        """Initialize test frameworks configuration"""
        return {
            "jest": {
                "unit_tests": True,
                "integration_tests": True,
                "snapshot_tests": True,
                "coverage": True
            },
            "playwright": {
                "e2e_tests": True,
                "visual_regression": True,
                "performance_tests": True,
                "cross_browser": True
            },
            "cypress": {
                "e2e_tests": True,
                "component_tests": True,
                "api_tests": True
            }
        }
    
    def _initialize_test_patterns(self) -> Dict[str, List[str]]:
        """Initialize test patterns and best practices"""
        return {
            "unit_test_patterns": [
                "Arrange-Act-Assert",
                "Given-When-Then",
                "Test isolation",
                "Mocking dependencies",
                "Edge case testing"
            ],
            "e2e_test_patterns": [
                "Page Object Model",
                "User journey testing",
                "Cross-browser testing",
                "Mobile testing",
                "Performance testing"
            ],
            "accessibility_patterns": [
                "WCAG 2.1 AA compliance",
                "Screen reader testing",
                "Keyboard navigation",
                "Color contrast testing",
                "Focus management"
            ]
        }
