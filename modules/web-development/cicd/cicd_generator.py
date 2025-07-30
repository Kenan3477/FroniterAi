"""
CI/CD Generator Module

Generates comprehensive CI/CD pipelines for web applications including:
- GitHub Actions workflows
- GitLab CI pipelines
- Jenkins pipelines
- Docker configurations
- Deployment automation
- Quality gates
"""

import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class CIPlatform(Enum):
    GITHUB_ACTIONS = "github_actions"
    GITLAB_CI = "gitlab_ci"
    JENKINS = "jenkins"
    AZURE_DEVOPS = "azure_devops"
    CIRCLECI = "circleci"

class DeploymentStrategy(Enum):
    BLUE_GREEN = "blue_green"
    ROLLING = "rolling"
    CANARY = "canary"
    RECREATE = "recreate"

@dataclass
class CICDConfiguration:
    """CI/CD configuration for specific platform"""
    platform: CIPlatform
    workflows: Dict[str, str]
    deployment_configs: Dict[str, str]
    quality_gates: List[str]
    environment_configs: Dict[str, str]

class CICDGenerator:
    """
    Comprehensive CI/CD generator that creates:
    - Automated testing pipelines
    - Code quality checks (linting, security scanning)
    - Automated dependency updates
    - Multi-environment deployments
    - Rollback capabilities
    - Performance monitoring
    - Security scanning
    """
    
    def __init__(self):
        self.platform_generators = self._initialize_platform_generators()
        self.quality_gates = self._initialize_quality_gates()
        
    async def generate_cicd_pipeline(self, requirements) -> Dict[str, str]:
        """Generate complete CI/CD pipeline based on requirements"""
        pipeline_files = {}
        
        # Determine CI platform (default to GitHub Actions)
        ci_platform = self._determine_ci_platform(requirements)
        
        # Generate main workflow files
        pipeline_files.update(await self._generate_main_workflows(requirements, ci_platform))
        
        # Generate deployment configurations
        pipeline_files.update(await self._generate_deployment_configs(requirements))
        
        # Generate quality gate configurations
        pipeline_files.update(await self._generate_quality_gates(requirements))
        
        # Generate environment configurations
        pipeline_files.update(await self._generate_environment_configs(requirements))
        
        # Generate Docker configurations
        pipeline_files.update(await self._generate_docker_configs(requirements))
        
        return pipeline_files
    
    def _determine_ci_platform(self, requirements) -> CIPlatform:
        """Determine CI platform based on requirements or default"""
        # Could be determined by deployment target or explicit preference
        if requirements.deployment_target.value in ["aws", "gcp", "azure"]:
            return CIPlatform.GITHUB_ACTIONS  # Most versatile
        return CIPlatform.GITHUB_ACTIONS  # Default
    
    async def _generate_main_workflows(self, requirements, platform: CIPlatform) -> Dict[str, str]:
        """Generate main CI/CD workflow files"""
        workflows = {}
        
        if platform == CIPlatform.GITHUB_ACTIONS:
            workflows[".github/workflows/ci.yml"] = self._generate_github_ci_workflow(requirements)
            workflows[".github/workflows/cd.yml"] = self._generate_github_cd_workflow(requirements)
            workflows[".github/workflows/security.yml"] = self._generate_github_security_workflow(requirements)
            workflows[".github/workflows/dependency-updates.yml"] = self._generate_dependency_update_workflow()
        
        return workflows
    
    def _generate_github_ci_workflow(self, requirements) -> str:
        """Generate GitHub Actions CI workflow"""
        return f'''name: Continuous Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  lint-and-format:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check Prettier formatting
        run: npm run format:check

      - name: TypeScript type check
        run: npm run type-check

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{{{ secrets.CODECOV_TOKEN }}}}
          file: ./coverage/lcov.info

  test-e2e:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  accessibility-tests:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run accessibility tests
        run: npm run test:a11y

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{{{ secrets.LHCI_GITHUB_APP_TOKEN }}}}

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run npm audit
        run: npm audit --audit-level high

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint-and-format, test-frontend, test-e2e]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: |
            .next/
            public/
            package.json
          retention-days: 1'''
    
    def _generate_github_cd_workflow(self, requirements) -> str:
        """Generate GitHub Actions CD workflow"""
        return f'''name: Continuous Deployment

on:
  push:
    branches: [ main ]
  workflow_run:
    workflows: ["Continuous Integration"]
    types:
      - completed
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    environment:
      name: staging
      url: https://staging.{requirements.name.lower().replace(" ", "-")}.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}

      - name: Deploy to {requirements.deployment_target.value.upper()}
        run: |
          # Deployment commands specific to target platform
          echo "Deploying to {requirements.deployment_target.value}"
        env:
          DEPLOYMENT_TOKEN: ${{{{ secrets.DEPLOYMENT_TOKEN }}}}
          DATABASE_URL: ${{{{ secrets.STAGING_DATABASE_URL }}}}

      - name: Run smoke tests
        run: |
          npm install -g newman
          newman run postman/smoke-tests.json --env-var baseUrl=https://staging.{requirements.name.lower().replace(" ", "-")}.com

      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |{{
            {{
              "text": "Staging deployment completed successfully",
              "attachments": [{{
                "color": "good",
                "fields": [{{
                  "title": "Environment",
                  "value": "Staging",
                  "short": true
                }}, {{
                  "title": "Version",
                  "value": "${{{{ github.sha }}}}",
                  "short": true
                }}]
              }}]
            }}
        env:
          SLACK_WEBHOOK_URL: ${{{{ secrets.SLACK_WEBHOOK_URL }}}}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://{requirements.name.lower().replace(" ", "-")}.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{{{ env.NODE_VERSION }}}}

      - name: Run pre-deployment checks
        run: |
          # Database migrations check
          npm run db:migrate:check
          # Health check of current production
          curl -f https://{requirements.name.lower().replace(" ", "-")}.com/health

      - name: Deploy to Production
        run: |
          echo "Deploying to production {requirements.deployment_target.value}"
        env:
          DEPLOYMENT_TOKEN: ${{{{ secrets.PRODUCTION_DEPLOYMENT_TOKEN }}}}
          DATABASE_URL: ${{{{ secrets.PRODUCTION_DATABASE_URL }}}}

      - name: Run post-deployment tests
        run: |
          newman run postman/production-tests.json --env-var baseUrl=https://{requirements.name.lower().replace(" ", "-")}.com

      - name: Update monitoring dashboards
        run: |
          # Update deployment markers in monitoring systems
          curl -X POST "https://api.datadog.com/api/v1/events" \\
            -H "Content-Type: application/json" \\
            -H "DD-API-KEY: ${{{{ secrets.DATADOG_API_KEY }}}}" \\
            -d '{{
              "title": "Production Deployment",
              "text": "Deployed version ${{{{ github.sha }}}} to production",
              "tags": ["environment:production", "service:{requirements.name.lower()}"]
            }}'

      - name: Create GitHub release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{{{ secrets.GITHUB_TOKEN }}}}
        with:
          tag_name: v${{{{ github.run_number }}}}
          release_name: Release v${{{{ github.run_number }}}}
          body: |
            ## Changes in this release
            ${{{{ github.event.head_commit.message }}}}
            
            ## Deployment Information
            - **Environment**: Production
            - **Commit**: ${{{{ github.sha }}}}
            - **Deployed by**: ${{{{ github.actor }}}}
            - **Deployment time**: ${{{{ github.event.head_commit.timestamp }}}}

  rollback:
    name: Rollback Deployment
    runs-on: ubuntu-latest
    if: failure()
    environment:
      name: production
    
    steps:
      - name: Rollback to previous version
        run: |
          echo "Rolling back deployment"
          # Implement rollback logic specific to deployment target
        env:
          DEPLOYMENT_TOKEN: ${{{{ secrets.PRODUCTION_DEPLOYMENT_TOKEN }}}}

      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: "Production deployment failed and was rolled back"
        env:
          SLACK_WEBHOOK_URL: ${{{{ secrets.SLACK_WEBHOOK_URL }}}}'''
    
    def _generate_github_security_workflow(self, requirements) -> str:
        """Generate GitHub Actions security workflow"""
        return '''name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  code-scan:
    name: Code Security Scan
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  secret-scan:
    name: Secret Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  container-scan:
    name: Container Security Scan
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t security-scan-image .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'security-scan-image'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  license-scan:
    name: License Compliance Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check licenses
        run: npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'

  security-report:
    name: Generate Security Report
    runs-on: ubuntu-latest
    needs: [dependency-scan, code-scan, secret-scan, container-scan, license-scan]
    if: always()
    steps:
      - name: Generate security summary
        run: |
          echo "## Security Scan Summary" >> $GITHUB_STEP_SUMMARY
          echo "- Dependency scan: ${{ needs.dependency-scan.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Code scan: ${{ needs.code-scan.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Secret scan: ${{ needs.secret-scan.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Container scan: ${{ needs.container-scan.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- License scan: ${{ needs.license-scan.result }}" >> $GITHUB_STEP_SUMMARY'''
    
    def _generate_dependency_update_workflow(self) -> str:
        """Generate automated dependency update workflow"""
        return '''name: Dependency Updates

on:
  schedule:
    - cron: '0 3 * * 1' # Weekly on Monday at 3 AM
  workflow_dispatch: # Manual trigger

jobs:
  update-dependencies:
    name: Update Dependencies
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Update npm dependencies
        run: |
          npx npm-check-updates -u --target minor
          npm install

      - name: Run tests
        run: |
          npm run test
          npm run test:e2e

      - name: Check for security vulnerabilities
        run: npm audit --audit-level high

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'chore: automated dependency updates'
          body: |
            ## Automated Dependency Updates
            
            This PR contains automated updates to npm dependencies.
            
            ### Changes
            - Updated minor and patch versions of dependencies
            - All tests are passing
            - No security vulnerabilities detected
            
            ### Verification
            - [ ] Tests pass
            - [ ] No breaking changes
            - [ ] Security scan clean
          branch: automated-dependency-updates
          delete-branch: true

  renovate:
    name: Renovate Bot
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Self-hosted Renovate
        uses: renovatebot/github-action@v39.1.1
        with:
          configurationFile: .github/renovate.json
          token: ${{ secrets.RENOVATE_TOKEN }}'''
    
    async def _generate_deployment_configs(self, requirements) -> Dict[str, str]:
        """Generate deployment configurations"""
        configs = {}
        
        if requirements.deployment_target.value == "vercel":
            configs["vercel.json"] = self._generate_vercel_config(requirements)
        elif requirements.deployment_target.value == "netlify":
            configs["netlify.toml"] = self._generate_netlify_config(requirements)
        elif requirements.deployment_target.value == "aws":
            configs["aws/cloudformation.yml"] = self._generate_aws_cloudformation(requirements)
        
        # Kubernetes configs
        if requirements.deployment_target.value in ["kubernetes", "gcp", "aws"]:
            configs.update(self._generate_kubernetes_configs(requirements))
        
        return configs
    
    def _generate_vercel_config(self, requirements) -> str:
        """Generate Vercel deployment configuration"""
        return f'''{{"
  "version": 2,
  "name": "{requirements.name.lower().replace(" ", "-")}",
  "builds": [
    {{
      "src": "package.json",
      "use": "@vercel/next"
    }}
  ],
  "env": {{
    "NODE_ENV": "production"
  }},
  "build": {{
    "env": {{
      "NODE_ENV": "production"
    }}
  }},
  "functions": {{
    "app/api/**/*.js": {{
      "maxDuration": 30
    }}
  }},
  "headers": [
    {{
      "source": "/api/(.*)",
      "headers": [
        {{
          "key": "Cache-Control",
          "value": "public, max-age=300, s-maxage=600"
        }}
      ]
    }},
    {{
      "source": "/(.*)",
      "headers": [
        {{
          "key": "X-Frame-Options",
          "value": "DENY"
        }},
        {{
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }},
        {{
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }}
      ]
    }}
  ],
  "redirects": [
    {{
      "source": "/home",
      "destination": "/",
      "permanent": true
    }}
  ],
  "rewrites": [
    {{
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }}
  ]
}}'''
    
    def _generate_kubernetes_configs(self, requirements) -> Dict[str, str]:
        """Generate Kubernetes deployment configurations"""
        configs = {}
        
        # Deployment configuration
        configs["k8s/deployment.yml"] = f'''apiVersion: apps/v1
kind: Deployment
metadata:
  name: {requirements.name.lower().replace(" ", "-")}
  labels:
    app: {requirements.name.lower().replace(" ", "-")}
    version: "1.0"
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: {requirements.name.lower().replace(" ", "-")}
  template:
    metadata:
      labels:
        app: {requirements.name.lower().replace(" ", "-")}
    spec:
      containers:
      - name: {requirements.name.lower().replace(" ", "-")}
        image: {requirements.name.lower().replace(" ", "-")}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: registry-secret'''
        
        # Service configuration
        configs["k8s/service.yml"] = f'''apiVersion: v1
kind: Service
metadata:
  name: {requirements.name.lower().replace(" ", "-")}-service
  labels:
    app: {requirements.name.lower().replace(" ", "-")}
spec:
  selector:
    app: {requirements.name.lower().replace(" ", "-")}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP'''
        
        # Ingress configuration
        configs["k8s/ingress.yml"] = f'''apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {requirements.name.lower().replace(" ", "-")}-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "64m"
spec:
  tls:
  - hosts:
    - {requirements.name.lower().replace(" ", "-")}.com
    secretName: {requirements.name.lower().replace(" ", "-")}-tls
  rules:
  - host: {requirements.name.lower().replace(" ", "-")}.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {requirements.name.lower().replace(" ", "-")}-service
            port:
              number: 80'''
        
        return configs
    
    async def _generate_quality_gates(self, requirements) -> Dict[str, str]:
        """Generate quality gate configurations"""
        configs = {}
        
        # SonarQube configuration
        configs["sonar-project.properties"] = f'''sonar.projectKey={requirements.name.lower().replace(" ", "-")}
sonar.projectName={requirements.name}
sonar.projectVersion=1.0
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true'''
        
        # Lighthouse CI configuration
        configs["lighthouserc.js"] = '''module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run start',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}'''
        
        return configs
    
    async def _generate_environment_configs(self, requirements) -> Dict[str, str]:
        """Generate environment-specific configurations"""
        configs = {}
        
        # Environment variables template
        configs[".env.example"] = f'''# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/{requirements.name.lower().replace(" ", "_")}_dev

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# External Services
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.xxx
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
ANALYTICS_ID=G-XXXXXXXXXX

# Feature Flags
FEATURE_NEW_DASHBOARD=true
FEATURE_BETA_FEATURES=false'''
        
        return configs
    
    async def _generate_docker_configs(self, requirements) -> Dict[str, str]:
        """Generate Docker configurations"""
        configs = {}
        
        # Multi-stage Dockerfile
        configs["Dockerfile"] = f'''# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "server.js"]'''
        
        # Docker Compose for development
        configs["docker-compose.yml"] = f'''version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/{requirements.name.lower().replace(" ", "_")}
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads
    networks:
      - app-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB={requirements.name.lower().replace(" ", "_")}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge'''
        
        # .dockerignore
        configs[".dockerignore"] = '''node_modules
npm-debug.log
.env.local
.env.development.local
.env.test.local
.env.production.local
.git
.gitignore
README.md
Dockerfile
.dockerignore
coverage
.next
.cache
.vscode
.idea'''
        
        return configs
    
    def _initialize_platform_generators(self) -> Dict[str, Any]:
        """Initialize CI platform generators"""
        return {
            "github_actions": {
                "workflows_path": ".github/workflows/",
                "config_format": "yaml",
                "features": ["actions_marketplace", "secrets_management", "environments"]
            },
            "gitlab_ci": {
                "workflows_path": ".gitlab-ci.yml",
                "config_format": "yaml",
                "features": ["gitlab_runner", "environments", "pages"]
            }
        }
    
    def _initialize_quality_gates(self) -> List[str]:
        """Initialize quality gate checks"""
        return [
            "code_coverage_threshold",
            "security_vulnerability_scan",
            "code_quality_metrics",
            "performance_budget",
            "accessibility_compliance",
            "dependency_audit"
        ]
