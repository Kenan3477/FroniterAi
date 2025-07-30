"""
Performance Optimizer Module

Optimizes web applications for maximum performance including:
- Core Web Vitals optimization
- Bundle optimization
- Image optimization
- Caching strategies
- CDN configuration
- Database optimization
"""

import asyncio
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from enum import Enum

class PerformanceMetric(Enum):
    FIRST_CONTENTFUL_PAINT = "first_contentful_paint"
    LARGEST_CONTENTFUL_PAINT = "largest_contentful_paint"
    FIRST_INPUT_DELAY = "first_input_delay"
    CUMULATIVE_LAYOUT_SHIFT = "cumulative_layout_shift"
    TIME_TO_INTERACTIVE = "time_to_interactive"
    TOTAL_BLOCKING_TIME = "total_blocking_time"

class OptimizationType(Enum):
    BUNDLE_OPTIMIZATION = "bundle_optimization"
    IMAGE_OPTIMIZATION = "image_optimization"
    CACHING = "caching"
    CODE_SPLITTING = "code_splitting"
    LAZY_LOADING = "lazy_loading"
    PREFETCHING = "prefetching"
    CDN = "cdn"
    COMPRESSION = "compression"

@dataclass
class PerformanceTarget:
    """Performance target with specific metrics"""
    metric: PerformanceMetric
    target_value: float
    current_value: Optional[float] = None
    priority: str = "medium"  # low, medium, high, critical

@dataclass
class OptimizationRecommendation:
    """Performance optimization recommendation"""
    optimization_type: OptimizationType
    description: str
    implementation: str
    expected_improvement: str
    code_example: str
    priority: str

class PerformanceOptimizer:
    """
    Comprehensive performance optimizer that implements:
    - Core Web Vitals optimization (LCP, FID, CLS)
    - Bundle size optimization and code splitting
    - Image optimization and lazy loading
    - Caching strategies (browser, CDN, service worker)
    - Database query optimization
    - Asset optimization and compression
    - Performance monitoring and analysis
    """
    
    def __init__(self):
        self.core_web_vitals_targets = self._initialize_core_web_vitals()
        self.optimization_strategies = self._initialize_optimization_strategies()
        
    def analyze_performance_requirements(self, requirements) -> Dict[str, Any]:
        """Analyze requirements and generate performance optimization plan"""
        performance_targets = self._determine_performance_targets(requirements)
        optimizations = self._generate_optimization_recommendations(requirements)
        
        return {
            "performance_targets": performance_targets,
            "optimizations": optimizations,
            "implementation_plan": self._generate_implementation_plan(optimizations),
            "monitoring_setup": self._generate_monitoring_setup(requirements),
            "performance_budget": self._calculate_performance_budget(requirements)
        }
    
    def generate_performance_configurations(self, tech_stack, requirements) -> Dict[str, str]:
        """Generate performance configurations for specific tech stack"""
        configurations = {}
        
        # Bundle optimization
        configurations["bundle_config"] = self._generate_bundle_config(tech_stack)
        
        # Image optimization
        configurations["image_config"] = self._generate_image_optimization_config(tech_stack)
        
        # Caching configuration
        configurations["caching_config"] = self._generate_caching_config(tech_stack)
        
        # CDN configuration
        configurations["cdn_config"] = self._generate_cdn_config(requirements)
        
        # Service Worker for caching
        configurations["service_worker"] = self._generate_service_worker(requirements)
        
        # Performance monitoring
        configurations["monitoring"] = self._generate_performance_monitoring(tech_stack)
        
        return configurations
    
    def _determine_performance_targets(self, requirements) -> List[PerformanceTarget]:
        """Determine performance targets based on requirements"""
        targets = []
        
        # Core Web Vitals targets
        targets.extend([
            PerformanceTarget(
                metric=PerformanceMetric.LARGEST_CONTENTFUL_PAINT,
                target_value=2.5,  # seconds
                priority="critical"
            ),
            PerformanceTarget(
                metric=PerformanceMetric.FIRST_INPUT_DELAY,
                target_value=100,  # milliseconds
                priority="critical"
            ),
            PerformanceTarget(
                metric=PerformanceMetric.CUMULATIVE_LAYOUT_SHIFT,
                target_value=0.1,  # score
                priority="high"
            ),
            PerformanceTarget(
                metric=PerformanceMetric.FIRST_CONTENTFUL_PAINT,
                target_value=1.8,  # seconds
                priority="high"
            ),
            PerformanceTarget(
                metric=PerformanceMetric.TIME_TO_INTERACTIVE,
                target_value=3.8,  # seconds
                priority="medium"
            )
        ])
        
        # Adjust targets based on project type
        if "ecommerce" in requirements.features:
            # E-commerce needs better performance
            for target in targets:
                if target.metric == PerformanceMetric.LARGEST_CONTENTFUL_PAINT:
                    target.target_value = 2.0
                elif target.metric == PerformanceMetric.FIRST_INPUT_DELAY:
                    target.target_value = 75
        
        return targets
    
    def _generate_optimization_recommendations(self, requirements) -> List[OptimizationRecommendation]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        # Bundle Optimization
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.BUNDLE_OPTIMIZATION,
            description="Optimize JavaScript bundle size and loading",
            implementation="Code splitting, tree shaking, and dynamic imports",
            expected_improvement="30-50% reduction in initial bundle size",
            code_example=self._get_bundle_optimization_example(requirements.tech_stack),
            priority="high"
        ))
        
        # Image Optimization
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.IMAGE_OPTIMIZATION,
            description="Optimize images for faster loading",
            implementation="Next.js Image component, WebP format, responsive images",
            expected_improvement="40-60% reduction in image size",
            code_example=self._get_image_optimization_example(requirements.tech_stack),
            priority="high"
        ))
        
        # Code Splitting
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.CODE_SPLITTING,
            description="Split code into smaller chunks for faster loading",
            implementation="Route-based and component-based code splitting",
            expected_improvement="20-40% faster initial page load",
            code_example=self._get_code_splitting_example(requirements.tech_stack),
            priority="medium"
        ))
        
        # Lazy Loading
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.LAZY_LOADING,
            description="Load content only when needed",
            implementation="Intersection Observer API for images and components",
            expected_improvement="25-35% faster initial page load",
            code_example=self._get_lazy_loading_example(requirements.tech_stack),
            priority="medium"
        ))
        
        # Caching
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.CACHING,
            description="Implement comprehensive caching strategy",
            implementation="Browser cache, CDN cache, and service worker cache",
            expected_improvement="50-80% faster repeat visits",
            code_example=self._get_caching_example(requirements.tech_stack),
            priority="high"
        ))
        
        # Prefetching
        recommendations.append(OptimizationRecommendation(
            optimization_type=OptimizationType.PREFETCHING,
            description="Prefetch critical resources and routes",
            implementation="Link prefetching and resource hints",
            expected_improvement="15-25% faster navigation",
            code_example=self._get_prefetching_example(requirements.tech_stack),
            priority="medium"
        ))
        
        return recommendations
    
    def _get_bundle_optimization_example(self, tech_stack) -> str:
        """Generate bundle optimization example"""
        if "nextjs" in tech_stack.value.lower():
            return '''// Next.js Bundle Optimization
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      )
    }
    
    // Optimize packages
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'lodash': 'lodash-es',
      }
    }
    
    return config
  },
}

module.exports = nextConfig

// Dynamic imports for code splitting
const DynamicComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR for heavy components
})

// Tree shaking with named imports
import { debounce } from 'lodash-es' // ✅ Tree-shakeable
// import _ from 'lodash' // ❌ Imports entire library

// Route-based code splitting
const HomePage = lazy(() => import('./pages/Home'))
const AboutPage = lazy(() => import('./pages/About'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Suspense>
  )
}'''
        
        elif "vite" in tech_stack.value.lower():
            return '''// Vite Bundle Optimization
// vite.config.ts
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // Bundle analyzer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
  build: {
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@emotion/react'],
          utils: ['lodash-es', 'date-fns'],
        },
      },
    },
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'development',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['heavy-library'],
  },
})

// Dynamic imports
const HeavyChart = lazy(() => 
  import('./components/HeavyChart').then(module => ({
    default: module.HeavyChart
  }))
)'''
        
        return "# Bundle optimization depends on chosen tech stack"
    
    def _get_image_optimization_example(self, tech_stack) -> str:
        """Generate image optimization example"""
        if "nextjs" in tech_stack.value.lower():
            return '''// Next.js Image Optimization
import Image from 'next/image'

// Optimized image component
function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85} // Optimal quality vs size balance
      priority={props.priority || false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      {...props}
    />
  )
}

// Hero image with priority loading
function HeroSection() {
  return (
    <div className="relative h-screen">
      <Image
        src="/hero-image.jpg"
        alt="Hero"
        fill
        priority
        quality={90}
        className="object-cover"
      />
    </div>
  )
}

// Gallery with lazy loading
function ImageGallery({ images }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image, index) => (
        <div key={image.id} className="relative aspect-square">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            quality={75}
            loading={index < 6 ? "eager" : "lazy"} // Load first 6 eagerly
            className="object-cover rounded-lg"
          />
        </div>
      ))}
    </div>
  )
}

// next.config.js image configuration
const nextConfig = {
  images: {
    domains: ['example.com', 'cdn.example.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
  },
}'''
        
        return '''// Generic Image Optimization
// Lazy loading with Intersection Observer
function LazyImage({ src, alt, className }) {
  const [imageSrc, setImageSrc] = useState('')
  const [imageRef, setImageRef] = useState()
  
  useEffect(() => {
    let observer
    if (imageRef && imageSrc !== src) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setImageSrc(src)
              observer.unobserve(imageRef)
            }
          })
        },
        { threshold: 0.1 }
      )
      observer.observe(imageRef)
    }
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef)
      }
    }
  }, [imageRef, imageSrc, src])
  
  return (
    <div ref={setImageRef} className={className}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
}

// WebP with fallback
function ResponsiveImage({ src, alt }) {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <source srcSet={`${src}.jpg`} type="image/jpeg" />
      <img src={`${src}.jpg`} alt={alt} />
    </picture>
  )
}'''
    
    def _get_code_splitting_example(self, tech_stack) -> str:
        """Generate code splitting example"""
        return '''// React Code Splitting with Suspense
import { lazy, Suspense } from 'react'

// Route-based splitting
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Dashboard = lazy(() => import('./pages/Dashboard'))

// Component-based splitting
const HeavyChart = lazy(() => import('./components/HeavyChart'))
const DataTable = lazy(() => import('./components/DataTable'))

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

// Loading component with skeleton
function PageLoader() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  )
}

// Conditional loading based on user interaction
function Dashboard() {
  const [showChart, setShowChart] = useState(false)
  
  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => setShowChart(true)}>
        Show Chart
      </button>
      
      {showChart && (
        <Suspense fallback={<div>Loading chart...</div>}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  )
}

// Webpack magic comments for chunk names
const AdminPanel = lazy(() => 
  import(
    /* webpackChunkName: "admin" */ 
    './pages/AdminPanel'
  )
)

// Preload on hover for better UX
function NavigationLink({ to, children }) {
  const handleMouseEnter = () => {
    import('./pages/About') // Preload on hover
  }
  
  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  )
}'''
    
    def _get_lazy_loading_example(self, tech_stack) -> str:
        """Generate lazy loading example"""
        return '''// Comprehensive Lazy Loading Implementation
import { useInView } from 'react-intersection-observer'

// Lazy load components when they come into view
function LazySection({ children, className }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '100px 0px', // Load 100px before entering viewport
  })
  
  return (
    <div ref={ref} className={className}>
      {inView ? children : <div className="h-64 bg-gray-100" />}
    </div>
  )
}

// Lazy load images with blur placeholder
function LazyImage({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false)
  const { ref, inView } = useInView({ triggerOnce: true })
  
  return (
    <div ref={ref} className={`relative ${className}`}>
      {inView && (
        <>
          <img
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={`transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
        </>
      )}
    </div>
  )
}

// Lazy load content with skeleton
function ContentSection() {
  const [content, setContent] = useState(null)
  const { ref, inView } = useInView({ triggerOnce: true })
  
  useEffect(() => {
    if (inView && !content) {
      // Simulate API call
      setTimeout(() => {
        setContent('Loaded content...')
      }, 1000)
    }
  }, [inView, content])
  
  return (
    <div ref={ref}>
      {content ? (
        <div>{content}</div>
      ) : (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      )}
    </div>
  )
}

// Infinite scrolling with lazy loading
function InfiniteList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { ref, inView } = useInView()
  
  const loadMore = useCallback(async () => {
    if (loading) return
    setLoading(true)
    
    // Simulate API call
    const newItems = await fetchMoreItems()
    setItems(prev => [...prev, ...newItems])
    setLoading(false)
  }, [loading])
  
  useEffect(() => {
    if (inView) {
      loadMore()
    }
  }, [inView, loadMore])
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.content}</div>
      ))}
      <div ref={ref}>
        {loading && <div>Loading more...</div>}
      </div>
    </div>
  )
}'''
    
    def _get_caching_example(self, tech_stack) -> str:
        """Generate caching example"""
        return '''// Comprehensive Caching Strategy
// Service Worker for caching
// sw.js
const CACHE_NAME = 'my-app-v1'
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// React Query for API caching
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function UserProfile({ userId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 30 * 60 * 1000, // 30 minutes for user data
  })
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{data.name}</div>
}

// Browser cache headers (Next.js)
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600',
          },
        ],
      },
    ]
  },
}

// CDN configuration
// Cloudflare Workers example
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Cache static assets for 1 year
  if (url.pathname.startsWith('/static/')) {
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000')
    return newResponse
  }
  
  // Cache API responses for 5 minutes
  if (url.pathname.startsWith('/api/')) {
    const cacheKey = new Request(url.toString(), request)
    const cache = caches.default
    
    let response = await cache.match(cacheKey)
    if (!response) {
      response = await fetch(request)
      response = new Response(response.body, response)
      response.headers.set('Cache-Control', 'public, max-age=300')
      await cache.put(cacheKey, response.clone())
    }
    return response
  }
  
  return fetch(request)
}

// Local Storage caching utility
class CacheManager {
  static set(key, data, ttl = 3600000) { // 1 hour default
    const item = {
      data,
      expiry: Date.now() + ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  }
  
  static get(key) {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null
    
    const item = JSON.parse(itemStr)
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key)
      return null
    }
    
    return item.data
  }
  
  static clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => localStorage.removeItem(key))
  }
}'''
    
    def _get_prefetching_example(self, tech_stack) -> str:
        """Generate prefetching example"""
        return '''// Resource Prefetching and Preloading
// Next.js Link prefetching
import Link from 'next/link'

function Navigation() {
  return (
    <nav>
      <Link href="/about" prefetch>
        About
      </Link>
      <Link href="/products" prefetch={false}>
        Products (no prefetch)
      </Link>
    </nav>
  )
}

// Programmatic prefetching
import { useRouter } from 'next/router'

function ProductCard({ product }) {
  const router = useRouter()
  
  const handleMouseEnter = () => {
    router.prefetch(`/products/${product.id}`)
  }
  
  return (
    <div onMouseEnter={handleMouseEnter}>
      <h3>{product.name}</h3>
      <Link href={`/products/${product.id}`}>
        View Details
      </Link>
    </div>
  )
}

// Resource hints in HTML head
function CustomHead() {
  return (
    <Head>
      {/* Preload critical resources */}
      <link
        rel="preload"
        href="/fonts/inter.woff2"
        as="font"
        type="font/woff2"
        crossOrigin=""
      />
      
      {/* Prefetch likely next pages */}
      <link rel="prefetch" href="/about" />
      <link rel="prefetch" href="/contact" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://api.example.com" />
      
      {/* DNS prefetch for external resources */}
      <link rel="dns-prefetch" href="https://cdn.example.com" />
    </Head>
  )
}

// Image prefetching utility
class ImagePrefetcher {
  static prefetchedImages = new Set()
  
  static prefetch(src) {
    if (this.prefetchedImages.has(src)) return
    
    const img = new Image()
    img.src = src
    this.prefetchedImages.add(src)
  }
  
  static prefetchList(srcList) {
    srcList.forEach(src => this.prefetch(src))
  }
}

// Usage in component
function ImageGallery({ images }) {
  useEffect(() => {
    // Prefetch next 3 images
    const nextImages = images.slice(0, 3).map(img => img.src)
    ImagePrefetcher.prefetchList(nextImages)
  }, [images])
  
  return (
    <div>
      {images.map(image => (
        <img key={image.id} src={image.src} alt={image.alt} />
      ))}
    </div>
  )
}

// API prefetching with React Query
function useProductPrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchProduct = useCallback((productId) => {
    queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => fetchProduct(productId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])
  
  return { prefetchProduct }
}

// Intersection Observer for smart prefetching
function SmartPrefetch({ children, href }) {
  const { prefetchProduct } = useProductPrefetch()
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  })
  
  useEffect(() => {
    if (inView && href) {
      const productId = href.split('/').pop()
      prefetchProduct(productId)
    }
  }, [inView, href, prefetchProduct])
  
  return <div ref={ref}>{children}</div>
}'''
    
    def _initialize_core_web_vitals(self) -> Dict[str, Dict[str, Any]]:
        """Initialize Core Web Vitals targets"""
        return {
            "LCP": {
                "name": "Largest Contentful Paint",
                "good": 2.5,
                "needs_improvement": 4.0,
                "poor": float('inf'),
                "unit": "seconds"
            },
            "FID": {
                "name": "First Input Delay",
                "good": 100,
                "needs_improvement": 300,
                "poor": float('inf'),
                "unit": "milliseconds"
            },
            "CLS": {
                "name": "Cumulative Layout Shift",
                "good": 0.1,
                "needs_improvement": 0.25,
                "poor": float('inf'),
                "unit": "score"
            }
        }
    
    def _initialize_optimization_strategies(self) -> Dict[str, List[str]]:
        """Initialize optimization strategies"""
        return {
            "bundle_optimization": [
                "Code splitting",
                "Tree shaking",
                "Dynamic imports",
                "Bundle analysis",
                "Minification"
            ],
            "image_optimization": [
                "WebP format",
                "Responsive images",
                "Lazy loading",
                "Image compression",
                "CDN delivery"
            ],
            "caching": [
                "Browser caching",
                "CDN caching",
                "Service worker",
                "API caching",
                "Static generation"
            ]
        }
