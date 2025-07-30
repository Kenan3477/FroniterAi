"""
React + Next.js Code Generator

Generates complete, production-ready React applications using Next.js 14+
with modern features, TypeScript, and best practices.
"""

import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from ..web_development import ProjectRequirements, TechStack, DatabaseType, DeploymentTarget

class ReactNextJSGenerator:
    """
    Advanced React + Next.js code generator that creates:
    - App Router architecture (Next.js 14+)
    - TypeScript throughout
    - Server Components and Client Components
    - Modern React patterns (hooks, context, suspense)
    - Performance optimizations
    - SEO optimization
    - Accessibility features
    """
    
    def __init__(self):
        self.component_templates = ComponentTemplates()
        self.page_templates = PageTemplates()
        self.hook_templates = HookTemplates()
        self.api_templates = APITemplates()
        self.config_templates = ConfigTemplates()
    
    async def generate_project_files(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate complete React + Next.js project"""
        files = {}
        
        # Core configuration files
        files.update(await self._generate_core_configs(requirements))
        
        # App structure (App Router)
        files.update(await self._generate_app_structure(requirements))
        
        # Components
        files.update(await self._generate_components(requirements))
        
        # Custom hooks
        files.update(await self._generate_hooks(requirements))
        
        # Utilities
        files.update(await self._generate_utilities(requirements))
        
        # API routes
        files.update(await self._generate_api_routes(requirements))
        
        # Styles
        files.update(await self._generate_styles(requirements))
        
        # Types
        files.update(await self._generate_types(requirements))
        
        # Database integration
        if requirements.database != DatabaseType.SQLITE:
            files.update(await self._generate_database_integration(requirements))
        
        # Authentication
        if requirements.authentication:
            files.update(await self._generate_auth_system(requirements))
        
        # Admin panel
        if requirements.admin_panel:
            files.update(await self._generate_admin_panel(requirements))
        
        return files
    
    async def _generate_core_configs(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate core configuration files"""
        files = {}
        
        # Next.js configuration
        files["next.config.js"] = self._generate_next_config(requirements)
        
        # TypeScript configuration
        files["tsconfig.json"] = self._generate_tsconfig(requirements)
        
        # Tailwind CSS configuration
        files["tailwind.config.js"] = self._generate_tailwind_config(requirements)
        
        # PostCSS configuration
        files["postcss.config.js"] = self._generate_postcss_config()
        
        # Package.json
        files["package.json"] = self._generate_package_json(requirements)
        
        return files
    
    async def _generate_app_structure(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate App Router structure"""
        files = {}
        
        # Root layout
        files["app/layout.tsx"] = self._generate_root_layout(requirements)
        
        # Root page
        files["app/page.tsx"] = self._generate_home_page(requirements)
        
        # Global styles
        files["app/globals.css"] = self._generate_global_styles()
        
        # Loading UI
        files["app/loading.tsx"] = self._generate_loading_component()
        
        # Error UI
        files["app/error.tsx"] = self._generate_error_component()
        
        # Not Found UI
        files["app/not-found.tsx"] = self._generate_not_found_component()
        
        # Metadata API
        files["app/metadata.ts"] = self._generate_metadata_config(requirements)
        
        # Generate feature pages based on requirements
        if "authentication" in requirements.features:
            files.update(self._generate_auth_pages())
        
        if "admin_panel" in requirements.features:
            files.update(self._generate_admin_pages())
        
        if "blog" in requirements.features:
            files.update(self._generate_blog_pages())
        
        if "ecommerce" in requirements.features:
            files.update(self._generate_ecommerce_pages())
        
        return files
    
    async def _generate_components(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate reusable components"""
        files = {}
        
        # UI Components
        files["components/ui/Button.tsx"] = self.component_templates.button_component()
        files["components/ui/Input.tsx"] = self.component_templates.input_component()
        files["components/ui/Modal.tsx"] = self.component_templates.modal_component()
        files["components/ui/Card.tsx"] = self.component_templates.card_component()
        files["components/ui/Badge.tsx"] = self.component_templates.badge_component()
        files["components/ui/Avatar.tsx"] = self.component_templates.avatar_component()
        files["components/ui/Spinner.tsx"] = self.component_templates.spinner_component()
        files["components/ui/Toast.tsx"] = self.component_templates.toast_component()
        files["components/ui/Dropdown.tsx"] = self.component_templates.dropdown_component()
        files["components/ui/Tabs.tsx"] = self.component_templates.tabs_component()
        
        # Layout Components
        files["components/layout/Header.tsx"] = self.component_templates.header_component(requirements)
        files["components/layout/Footer.tsx"] = self.component_templates.footer_component(requirements)
        files["components/layout/Sidebar.tsx"] = self.component_templates.sidebar_component(requirements)
        files["components/layout/Navigation.tsx"] = self.component_templates.navigation_component(requirements)
        
        # Feature Components
        if requirements.authentication:
            files["components/auth/LoginForm.tsx"] = self.component_templates.login_form_component()
            files["components/auth/SignupForm.tsx"] = self.component_templates.signup_form_component()
            files["components/auth/ProfileCard.tsx"] = self.component_templates.profile_card_component()
        
        if "search" in requirements.features:
            files["components/search/SearchBar.tsx"] = self.component_templates.search_bar_component()
            files["components/search/SearchResults.tsx"] = self.component_templates.search_results_component()
        
        if "forms" in requirements.features:
            files["components/forms/ContactForm.tsx"] = self.component_templates.contact_form_component()
            files["components/forms/FormField.tsx"] = self.component_templates.form_field_component()
        
        return files
    
    async def _generate_hooks(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate custom React hooks"""
        files = {}
        
        # Common hooks
        files["hooks/useLocalStorage.ts"] = self.hook_templates.use_local_storage()
        files["hooks/useDebounce.ts"] = self.hook_templates.use_debounce()
        files["hooks/useFetch.ts"] = self.hook_templates.use_fetch()
        files["hooks/useAsync.ts"] = self.hook_templates.use_async()
        files["hooks/useToggle.ts"] = self.hook_templates.use_toggle()
        files["hooks/useClickOutside.ts"] = self.hook_templates.use_click_outside()
        files["hooks/useMediaQuery.ts"] = self.hook_templates.use_media_query()
        
        # Authentication hooks
        if requirements.authentication:
            files["hooks/useAuth.ts"] = self.hook_templates.use_auth()
            files["hooks/useUser.ts"] = self.hook_templates.use_user()
        
        # Feature-specific hooks
        if "real_time" in requirements.features:
            files["hooks/useWebSocket.ts"] = self.hook_templates.use_websocket()
        
        if "search" in requirements.features:
            files["hooks/useSearch.ts"] = self.hook_templates.use_search()
        
        return files
    
    async def _generate_utilities(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate utility functions"""
        files = {}
        
        files["lib/utils.ts"] = self._generate_utils_file()
        files["lib/constants.ts"] = self._generate_constants_file(requirements)
        files["lib/validations.ts"] = self._generate_validations_file()
        files["lib/formatters.ts"] = self._generate_formatters_file()
        files["lib/api.ts"] = self._generate_api_client(requirements)
        
        if requirements.authentication:
            files["lib/auth.ts"] = self._generate_auth_utils()
        
        if requirements.database != DatabaseType.SQLITE:
            files["lib/db.ts"] = self._generate_database_client(requirements)
        
        return files
    
    async def _generate_api_routes(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate API routes"""
        files = {}
        
        # Health check
        files["app/api/health/route.ts"] = self.api_templates.health_check_route()
        
        # Authentication routes
        if requirements.authentication:
            files["app/api/auth/login/route.ts"] = self.api_templates.login_route()
            files["app/api/auth/signup/route.ts"] = self.api_templates.signup_route()
            files["app/api/auth/logout/route.ts"] = self.api_templates.logout_route()
            files["app/api/auth/me/route.ts"] = self.api_templates.me_route()
        
        # Feature-specific routes
        if "contact" in requirements.features:
            files["app/api/contact/route.ts"] = self.api_templates.contact_route()
        
        if "upload" in requirements.features:
            files["app/api/upload/route.ts"] = self.api_templates.upload_route()
        
        return files
    
    async def _generate_styles(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate styling files"""
        files = {}
        
        files["styles/globals.css"] = self._generate_global_css()
        files["styles/components.css"] = self._generate_component_styles()
        
        return files
    
    async def _generate_types(self, requirements: ProjectRequirements) -> Dict[str, str]:
        """Generate TypeScript type definitions"""
        files = {}
        
        files["types/index.ts"] = self._generate_global_types(requirements)
        files["types/api.ts"] = self._generate_api_types(requirements)
        
        if requirements.authentication:
            files["types/auth.ts"] = self._generate_auth_types()
        
        return files
    
    def _generate_next_config(self, requirements: ProjectRequirements) -> str:
        """Generate Next.js configuration"""
        config = {
            "experimental": {
                "appDir": True,
                "serverComponentsExternalPackages": []
            },
            "images": {
                "domains": [],
                "remotePatterns": []
            },
            "async headers()": """
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
            """
        }
        
        if requirements.pwa_support:
            config["experimental"]["appDir"] = True
        
        return f"""/** @type {{import('next').NextConfig}} */
const nextConfig = {json.dumps(config, indent=2)}

module.exports = nextConfig
"""
    
    def _generate_tsconfig(self, requirements: ProjectRequirements) -> str:
        """Generate TypeScript configuration"""
        return """{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}"""
    
    def _generate_package_json(self, requirements: ProjectRequirements) -> str:
        """Generate package.json with all dependencies"""
        dependencies = {
            "next": "^14.0.4",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "@types/node": "^20.10.0",
            "@types/react": "^18.2.45",
            "@types/react-dom": "^18.2.18",
            "typescript": "^5.3.3",
            "tailwindcss": "^3.3.6",
            "autoprefixer": "^10.4.16",
            "postcss": "^8.4.32",
            "clsx": "^2.0.0",
            "lucide-react": "^0.294.0"
        }
        
        dev_dependencies = {
            "eslint": "^8.56.0",
            "eslint-config-next": "^14.0.4",
            "@typescript-eslint/eslint-plugin": "^6.13.2",
            "@typescript-eslint/parser": "^6.13.2",
            "prettier": "^3.1.1",
            "prettier-plugin-tailwindcss": "^0.5.7"
        }
        
        # Add feature-specific dependencies
        if requirements.authentication:
            dependencies.update({
                "next-auth": "^4.24.5",
                "@auth/prisma-adapter": "^1.0.9",
                "bcryptjs": "^2.4.3",
                "@types/bcryptjs": "^2.4.6"
            })
        
        if requirements.database == DatabaseType.PRISMA:
            dependencies.update({
                "prisma": "^5.7.1",
                "@prisma/client": "^5.7.1"
            })
            dev_dependencies["prisma"] = "^5.7.1"
        
        if "forms" in requirements.features:
            dependencies.update({
                "react-hook-form": "^7.48.2",
                "@hookform/resolvers": "^3.3.2",
                "zod": "^3.22.4"
            })
        
        if requirements.payment_integration:
            dependencies["stripe"] = "^14.8.0"
        
        if requirements.real_time_features:
            dependencies["socket.io-client"] = "^4.7.4"
        
        scripts = {
            "dev": "next dev",
            "build": "next build",
            "start": "next start",
            "lint": "next lint",
            "type-check": "tsc --noEmit",
            "format": "prettier --write .",
            "format:check": "prettier --check ."
        }
        
        if requirements.testing_strategy.get("unit_tests"):
            dev_dependencies.update({
                "jest": "^29.7.0",
                "@testing-library/react": "^14.1.2",
                "@testing-library/jest-dom": "^6.1.5",
                "jest-environment-jsdom": "^29.7.0"
            })
            scripts["test"] = "jest"
            scripts["test:watch"] = "jest --watch"
        
        package = {
            "name": requirements.name.lower().replace(" ", "-"),
            "version": "0.1.0",
            "private": True,
            "description": requirements.description,
            "scripts": scripts,
            "dependencies": dependencies,
            "devDependencies": dev_dependencies,
            "engines": {
                "node": ">=18.0.0",
                "npm": ">=9.0.0"
            }
        }
        
        return json.dumps(package, indent=2)
    
    def _generate_root_layout(self, requirements: ProjectRequirements) -> str:
        """Generate root layout component"""
        return f'''import type {{ Metadata }} from 'next'
import {{ Inter }} from 'next/font/google'
import './globals.css'
import {{ Providers }} from '@/components/providers'
import {{ Toaster }} from '@/components/ui/toast'

const inter = Inter({{ subsets: ['latin'] }})

export const metadata: Metadata = {{
  title: '{requirements.name}',
  description: '{requirements.description}',
  keywords: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
  authors: [{{ name: 'Your Name' }}],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {{
    type: 'website',
    locale: 'en_US',
    url: 'https://your-domain.com',
    title: '{requirements.name}',
    description: '{requirements.description}',
    siteName: '{requirements.name}',
  }},
  twitter: {{
    card: 'summary_large_image',
    title: '{requirements.name}',
    description: '{requirements.description}',
  }},
}}

export default function RootLayout({{
  children,
}}: {{
  children: React.ReactNode
}}) {{
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={{inter.className}}>
        <Providers>
          {{children}}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}}'''
    
    def _generate_home_page(self, requirements: ProjectRequirements) -> str:
        """Generate home page component"""
        return f'''import {{ Button }} from '@/components/ui/Button'
import {{ Card }} from '@/components/ui/Card'
import Link from 'next/link'

export default function HomePage() {{
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to {requirements.name}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {requirements.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild>
              <Link href="/get-started">
                Get Started
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/learn-more">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Fast Performance</h3>
            <p className="text-gray-600">Built with Next.js 14 for optimal performance and user experience.</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Type Safe</h3>
            <p className="text-gray-600">Fully typed with TypeScript for better developer experience and fewer bugs.</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Modern Stack</h3>
            <p className="text-gray-600">Uses the latest web technologies and best practices for maintainable code.</p>
          </Card>
        </div>
      </div>
    </main>
  )
}}'''


# Component Templates class for better organization
class ComponentTemplates:
    def button_component(self) -> str:
        return '''import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }'''
    
    def input_component(self) -> str:
        return '''import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }'''


# Page Templates class
class PageTemplates:
    pass

# Hook Templates class
class HookTemplates:
    def use_local_storage(self) -> str:
        return '''import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue] as const
}'''

# API Templates class
class APITemplates:
    def health_check_route(self) -> str:
        return '''import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
    { status: 200 }
  )
}'''

# Config Templates class
class ConfigTemplates:
    pass
