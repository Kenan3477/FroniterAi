"""
Visual Design System Module

A comprehensive design system that creates:
- Brand identity packages (logos, color palettes, typography)
- Responsive UI layouts based on UX best practices
- Website mockups convertible to production code
- Modern design trends with optimal usability
- Performance-optimized assets across devices
"""

import asyncio
import json
import base64
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from pathlib import Path
import colorsys
import math

# Import design system components
from .brand_identity import BrandIdentityGenerator
from .ui_layout import ResponsiveLayoutGenerator
from .mockup_generator import WebsiteMockupGenerator
from .asset_optimizer import AssetOptimizer
from .design_trends import DesignTrendAnalyzer

class DesignStyle(Enum):
    """Design style categories"""
    MINIMALIST = "minimalist"
    MODERN = "modern"
    CORPORATE = "corporate"
    CREATIVE = "creative"
    TECH = "tech"
    LUXURY = "luxury"
    PLAYFUL = "playful"
    ELEGANT = "elegant"
    BOLD = "bold"
    CLEAN = "clean"

class IndustryType(Enum):
    """Industry categories for design context"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    RETAIL = "retail"
    HOSPITALITY = "hospitality"
    REAL_ESTATE = "real_estate"
    CONSULTING = "consulting"
    CREATIVE = "creative"
    NONPROFIT = "nonprofit"

class DeviceTarget(Enum):
    """Target device categories"""
    MOBILE = "mobile"
    TABLET = "tablet"
    DESKTOP = "desktop"
    WEARABLE = "wearable"
    TV = "tv"
    ALL = "all"

@dataclass
class DesignRequirements:
    """Design project requirements"""
    project_name: str
    industry: IndustryType
    design_style: DesignStyle
    target_audience: str
    brand_values: List[str]
    color_preferences: Optional[List[str]] = None
    device_targets: List[DeviceTarget] = field(default_factory=lambda: [DeviceTarget.ALL])
    accessibility_level: str = "WCAG_AA"
    performance_priority: str = "high"
    modern_trends: bool = True
    responsive_design: bool = True

@dataclass
class DesignAssets:
    """Complete design asset package"""
    brand_identity: Dict[str, Any]
    ui_layouts: Dict[str, Any]
    mockups: Dict[str, Any]
    assets: Dict[str, Any]
    style_guide: Dict[str, Any]
    code_snippets: Dict[str, str]

class VisualDesignModule:
    """
    Complete Visual Design System that creates:
    
    🎨 Brand Identity Packages:
    - Logo designs (SVG, multiple variations)
    - Color palettes (primary, secondary, semantic)
    - Typography systems (font pairings, hierarchy)
    - Brand guidelines and usage rules
    
    📱 Responsive UI Layouts:
    - Mobile-first responsive designs
    - Grid systems and spacing
    - Component libraries (buttons, forms, cards)
    - Navigation patterns and UX flows
    
    🖥️ Website Mockups:
    - High-fidelity mockups (homepage, key pages)
    - Interactive prototypes
    - Production-ready HTML/CSS/JS code
    - Design system documentation
    
    🚀 Performance Optimization:
    - SVG optimization and compression
    - Responsive image generation
    - CSS/JS minification
    - Web font optimization
    
    ✨ Modern Design Trends:
    - 2025 design patterns and trends
    - Accessibility-first design
    - Dark/light mode support
    - Micro-interactions and animations
    """
    
    def __init__(self):
        """Initialize the visual design system"""
        self.brand_generator = BrandIdentityGenerator()
        self.layout_generator = ResponsiveLayoutGenerator()
        self.mockup_generator = WebsiteMockupGenerator()
        self.asset_optimizer = AssetOptimizer()
        self.trend_analyzer = DesignTrendAnalyzer()
        
        # Design system cache for consistency
        self.design_cache = {}
        
    async def process_query(self, query: str) -> Dict[str, Any]:
        """
        Process natural language query and generate complete design system
        
        Examples:
        - "Create a modern tech startup brand with clean UI for a SaaS platform"
        - "Design a luxury hotel website with elegant branding and mobile-first layout"
        - "Generate a healthcare app interface with accessible design and calming colors"
        """
        
        # Parse design requirements from natural language
        requirements = await self._parse_design_requirements(query)
        
        # Generate complete design system
        design_assets = await self._generate_design_system(requirements)
        
        return {
            "requirements": requirements.__dict__,
            "design_assets": design_assets.__dict__,
            "implementation_guide": self._generate_implementation_guide(requirements),
            "style_guide": self._generate_style_guide(design_assets),
            "usage_examples": self._generate_usage_examples(design_assets)
        }
    
    async def _parse_design_requirements(self, query: str) -> DesignRequirements:
        """Parse natural language query into design requirements"""
        
        # Industry detection
        industry_keywords = {
            "tech": IndustryType.TECHNOLOGY,
            "healthcare": IndustryType.HEALTHCARE,
            "finance": IndustryType.FINANCE,
            "education": IndustryType.EDUCATION,
            "retail": IndustryType.RETAIL,
            "hotel": IndustryType.HOSPITALITY,
            "real estate": IndustryType.REAL_ESTATE,
            "consulting": IndustryType.CONSULTING,
            "creative": IndustryType.CREATIVE,
            "nonprofit": IndustryType.NONPROFIT
        }
        
        industry = IndustryType.TECHNOLOGY  # Default
        for keyword, ind in industry_keywords.items():
            if keyword.lower() in query.lower():
                industry = ind
                break
        
        # Style detection
        style_keywords = {
            "minimalist": DesignStyle.MINIMALIST,
            "modern": DesignStyle.MODERN,
            "corporate": DesignStyle.CORPORATE,
            "creative": DesignStyle.CREATIVE,
            "tech": DesignStyle.TECH,
            "luxury": DesignStyle.LUXURY,
            "playful": DesignStyle.PLAYFUL,
            "elegant": DesignStyle.ELEGANT,
            "bold": DesignStyle.BOLD,
            "clean": DesignStyle.CLEAN
        }
        
        design_style = DesignStyle.MODERN  # Default
        for keyword, style in style_keywords.items():
            if keyword.lower() in query.lower():
                design_style = style
                break
        
        # Extract project name
        project_name = "Design Project"
        if "for" in query.lower():
            parts = query.split("for")
            if len(parts) > 1:
                project_name = parts[-1].strip()
        
        # Brand values based on style and industry
        brand_values = self._generate_brand_values(design_style, industry)
        
        return DesignRequirements(
            project_name=project_name,
            industry=industry,
            design_style=design_style,
            target_audience="Professional users",
            brand_values=brand_values,
            device_targets=[DeviceTarget.ALL],
            accessibility_level="WCAG_AA",
            performance_priority="high",
            modern_trends=True,
            responsive_design=True
        )
    
    def _generate_brand_values(self, style: DesignStyle, industry: IndustryType) -> List[str]:
        """Generate brand values based on style and industry"""
        
        style_values = {
            DesignStyle.MINIMALIST: ["simplicity", "clarity", "focus"],
            DesignStyle.MODERN: ["innovation", "efficiency", "forward-thinking"],
            DesignStyle.CORPORATE: ["trust", "professionalism", "reliability"],
            DesignStyle.CREATIVE: ["creativity", "originality", "inspiration"],
            DesignStyle.TECH: ["innovation", "precision", "scalability"],
            DesignStyle.LUXURY: ["exclusivity", "premium quality", "sophistication"],
            DesignStyle.PLAYFUL: ["joy", "creativity", "approachability"],
            DesignStyle.ELEGANT: ["sophistication", "refinement", "quality"],
            DesignStyle.BOLD: ["confidence", "impact", "leadership"],
            DesignStyle.CLEAN: ["clarity", "simplicity", "usability"]
        }
        
        industry_values = {
            IndustryType.TECHNOLOGY: ["innovation", "reliability", "scalability"],
            IndustryType.HEALTHCARE: ["trust", "care", "accessibility"],
            IndustryType.FINANCE: ["security", "trust", "stability"],
            IndustryType.EDUCATION: ["knowledge", "growth", "accessibility"],
            IndustryType.RETAIL: ["convenience", "value", "experience"],
            IndustryType.HOSPITALITY: ["comfort", "luxury", "service"],
            IndustryType.REAL_ESTATE: ["trust", "value", "expertise"],
            IndustryType.CONSULTING: ["expertise", "results", "partnership"],
            IndustryType.CREATIVE: ["creativity", "originality", "expression"],
            IndustryType.NONPROFIT: ["impact", "transparency", "community"]
        }
        
        # Combine style and industry values
        values = list(set(style_values.get(style, []) + industry_values.get(industry, [])))
        return values[:5]  # Limit to 5 key values
    
    async def _generate_design_system(self, requirements: DesignRequirements) -> DesignAssets:
        """Generate complete design system"""
        
        # Generate brand identity
        brand_identity = await self.brand_generator.generate_brand_identity(requirements)
        
        # Generate responsive UI layouts
        ui_layouts = await self.layout_generator.generate_layouts(requirements, brand_identity)
        
        # Generate website mockups
        mockups = await self.mockup_generator.generate_mockups(requirements, brand_identity, ui_layouts)
        
        # Optimize assets for performance
        optimized_assets = await self.asset_optimizer.optimize_assets(
            brand_identity, ui_layouts, mockups
        )
        
        # Generate style guide
        style_guide = await self._generate_comprehensive_style_guide(
            requirements, brand_identity, ui_layouts
        )
        
        # Generate production code snippets
        code_snippets = await self._generate_code_snippets(
            requirements, brand_identity, ui_layouts, mockups
        )
        
        return DesignAssets(
            brand_identity=brand_identity,
            ui_layouts=ui_layouts,
            mockups=mockups,
            assets=optimized_assets,
            style_guide=style_guide,
            code_snippets=code_snippets
        )
    
    async def _generate_comprehensive_style_guide(
        self, requirements: DesignRequirements, brand_identity: Dict, ui_layouts: Dict
    ) -> Dict[str, Any]:
        """Generate comprehensive style guide"""
        
        return {
            "overview": {
                "project_name": requirements.project_name,
                "industry": requirements.industry.value,
                "design_style": requirements.design_style.value,
                "brand_values": requirements.brand_values
            },
            "brand_guidelines": {
                "logo_usage": brand_identity.get("logo_guidelines", {}),
                "color_palette": brand_identity.get("color_palette", {}),
                "typography": brand_identity.get("typography", {}),
                "imagery_style": brand_identity.get("imagery_guidelines", {})
            },
            "ui_guidelines": {
                "layout_principles": ui_layouts.get("layout_principles", {}),
                "component_library": ui_layouts.get("components", {}),
                "spacing_system": ui_layouts.get("spacing", {}),
                "responsive_breakpoints": ui_layouts.get("breakpoints", {})
            },
            "accessibility": {
                "color_contrast": "WCAG AA compliant",
                "font_sizes": "Minimum 16px for body text",
                "touch_targets": "Minimum 44px for interactive elements",
                "keyboard_navigation": "Full keyboard accessibility"
            },
            "performance": {
                "image_optimization": "WebP format with fallbacks",
                "font_loading": "Font-display: swap",
                "css_optimization": "Critical CSS inlined",
                "javascript": "Modern ES6+ with polyfills"
            }
        }
    
    async def _generate_code_snippets(
        self, requirements: DesignRequirements, brand_identity: Dict, 
        ui_layouts: Dict, mockups: Dict
    ) -> Dict[str, str]:
        """Generate production-ready code snippets"""
        
        # Extract color palette
        primary_color = brand_identity.get("color_palette", {}).get("primary", "#007bff")
        secondary_color = brand_identity.get("color_palette", {}).get("secondary", "#6c757d")
        
        # Extract typography
        primary_font = brand_identity.get("typography", {}).get("primary_font", "Inter")
        
        code_snippets = {}
        
        # CSS Variables
        code_snippets["css_variables.css"] = f"""/* Design System CSS Variables */
:root {{
  /* Colors */
  --color-primary: {primary_color};
  --color-secondary: {secondary_color};
  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
  --color-info: #17a2b8;
  
  /* Grays */
  --color-gray-100: #f8f9fa;
  --color-gray-200: #e9ecef;
  --color-gray-300: #dee2e6;
  --color-gray-400: #ced4da;
  --color-gray-500: #adb5bd;
  --color-gray-600: #6c757d;
  --color-gray-700: #495057;
  --color-gray-800: #343a40;
  --color-gray-900: #212529;
  
  /* Typography */
  --font-family-primary: '{primary_font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  
  /* Font Sizes */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  
  /* Border Radius */
  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
  --border-radius-xl: 0.75rem;
  --border-radius-2xl: 1rem;
  --border-radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
}}

/* Dark mode support */
@media (prefers-color-scheme: dark) {{
  :root {{
    --color-gray-100: #1a1a1a;
    --color-gray-200: #262626;
    --color-gray-300: #404040;
    --color-gray-400: #525252;
    --color-gray-500: #737373;
    --color-gray-600: #a3a3a3;
    --color-gray-700: #d4d4d4;
    --color-gray-800: #e5e5e5;
    --color-gray-900: #f5f5f5;
  }}
}}"""
        
        # Component Library CSS
        code_snippets["components.css"] = """/* Component Library */

/* Button Components */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: color-mix(in srgb, var(--color-primary) 85%, black);
  border-color: color-mix(in srgb, var(--color-primary) 85%, black);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
  border-color: var(--color-secondary);
}

.btn-outline {
  background-color: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn-outline:hover {
  background-color: var(--color-primary);
  color: white;
}

/* Card Components */
.card {
  background-color: white;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.card-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
  background-color: var(--color-gray-50);
}

.card-body {
  padding: var(--spacing-lg);
}

.card-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  background-color: var(--color-gray-50);
}

/* Form Components */
.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-gray-700);
}

.form-input {
  display: block;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-gray-900);
  background-color: white;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

/* Navigation Components */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background-color: white;
  border-bottom: 1px solid var(--color-gray-200);
}

.navbar-brand {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.navbar-nav {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--spacing-lg);
}

.navbar-nav a {
  color: var(--color-gray-600);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-fast);
}

.navbar-nav a:hover,
.navbar-nav a.active {
  color: var(--color-primary);
}

/* Responsive Grid */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 calc(var(--spacing-md) * -0.5);
}

.col {
  flex: 1;
  padding: 0 calc(var(--spacing-md) * 0.5);
}

@media (max-width: 768px) {
  .col {
    flex: 0 0 100%;
  }
}"""
        
        # JavaScript utilities
        code_snippets["utilities.js"] = """// Design System JavaScript Utilities

// Theme Management
class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
  }

  setTheme(theme) {
    this.theme = theme;
    this.applyTheme();
  }
}

// Component Registration
class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.initializeComponents();
  }

  register(name, component) {
    this.components.set(name, component);
  }

  initializeComponents() {
    // Auto-initialize components on page load
    document.addEventListener('DOMContentLoaded', () => {
      this.scanAndInitialize();
    });
  }

  scanAndInitialize() {
    // Scan for components and initialize them
    const elements = document.querySelectorAll('[data-component]');
    elements.forEach(element => {
      const componentName = element.dataset.component;
      const ComponentClass = this.components.get(componentName);
      if (ComponentClass) {
        new ComponentClass(element);
      }
    });
  }
}

// Responsive Utilities
class ResponsiveUtils {
  static breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  };

  static getCurrentBreakpoint() {
    const width = window.innerWidth;
    const breakpoints = Object.entries(this.breakpoints)
      .sort(([,a], [,b]) => b - a);
    
    for (const [name, minWidth] of breakpoints) {
      if (width >= minWidth) {
        return name;
      }
    }
    return 'xs';
  }

  static isBreakpoint(breakpoint) {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  static isBreakpointUp(breakpoint) {
    const current = window.innerWidth;
    const target = this.breakpoints[breakpoint];
    return current >= target;
  }

  static isBreakpointDown(breakpoint) {
    const current = window.innerWidth;
    const target = this.breakpoints[breakpoint];
    return current < target;
  }
}

// Animation Utilities
class AnimationUtils {
  static fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const start = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }

  static slideDown(element, duration = 300) {
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    const targetHeight = element.scrollHeight;
    const start = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.height = (targetHeight * progress) + 'px';
      
      if (progress === 1) {
        element.style.height = '';
        element.style.overflow = '';
      } else {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }

  static parallax(element, speed = 0.5) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const parallax = scrolled * speed;
      element.style.transform = `translateY(${parallax}px)`;
    });
  }
}

// Performance Utilities
class PerformanceUtils {
  static debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  static throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return func.apply(this, args);
      }
    };
  }

  static lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
}

// Initialize design system
const themeManager = new ThemeManager();
const componentRegistry = new ComponentRegistry();

// Export for use in other modules
window.DesignSystem = {
  ThemeManager,
  ComponentRegistry,
  ResponsiveUtils,
  AnimationUtils,
  PerformanceUtils
};"""
        
        return code_snippets
    
    def _generate_implementation_guide(self, requirements: DesignRequirements) -> str:
        """Generate implementation guide"""
        
        return f"""# {requirements.project_name} - Design System Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing your design system across web and mobile platforms.

## Quick Start

### 1. Setup Design Tokens
```css
/* Import the design system CSS variables */
@import url('./css/variables.css');
@import url('./css/components.css');
```

### 2. HTML Structure
```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{requirements.project_name}</title>
  <link rel="stylesheet" href="design-system.css">
</head>
<body>
  <!-- Your content here -->
  <script src="design-system.js"></script>
</body>
</html>
```

### 3. Component Usage
```html
<!-- Button Examples -->
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-outline">Outline Button</button>

<!-- Card Example -->
<div class="card">
  <div class="card-header">
    <h3>Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content goes here.</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Action</button>
  </div>
</div>

<!-- Form Example -->
<form>
  <div class="form-group">
    <label class="form-label" for="email">Email</label>
    <input class="form-input" type="email" id="email" name="email">
  </div>
  <button class="btn btn-primary" type="submit">Submit</button>
</form>
```

## Responsive Design

### Breakpoint System
- **xs**: 0px and up (mobile)
- **sm**: 576px and up (large mobile)
- **md**: 768px and up (tablet)
- **lg**: 992px and up (desktop)
- **xl**: 1200px and up (large desktop)
- **xxl**: 1400px and up (extra large)

### Grid System
```html
<div class="container">
  <div class="row">
    <div class="col">Column 1</div>
    <div class="col">Column 2</div>
    <div class="col">Column 3</div>
  </div>
</div>
```

## Accessibility Guidelines

### Color Contrast
- All text meets WCAG AA standards (4.5:1 ratio)
- Interactive elements have adequate contrast
- Focus indicators are clearly visible

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Focus traps are implemented in modals

### Screen Readers
- Semantic HTML elements are used
- ARIA labels and descriptions are provided
- Images have descriptive alt text

## Performance Optimization

### Image Optimization
```html
<!-- Responsive images with WebP support -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Description" loading="lazy">
</picture>
```

### Font Loading
```css
/* Optimize font loading */
@font-face {{
  font-family: '{requirements.project_name}';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}}
```

### CSS Optimization
- Critical CSS is inlined in `<head>`
- Non-critical CSS is loaded asynchronously
- Unused CSS is removed in production

## Dark Mode Support
```javascript
// Toggle dark mode
const themeToggle = document.querySelector('#theme-toggle');
themeToggle.addEventListener('click', () => {{
  DesignSystem.ThemeManager.toggleTheme();
}});
```

## Component Development

### Creating New Components
1. Define component structure in HTML
2. Add styles following BEM methodology
3. Implement JavaScript functionality
4. Add to component registry
5. Document usage and API

### Example Component
```javascript
class Modal {{
  constructor(element) {{
    this.element = element;
    this.init();
  }}

  init() {{
    this.bindEvents();
  }}

  bindEvents() {{
    // Event binding logic
  }}

  open() {{
    this.element.classList.add('modal-open');
    document.body.classList.add('modal-open');
  }}

  close() {{
    this.element.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
  }}
}}

// Register component
DesignSystem.ComponentRegistry.register('modal', Modal);
```

## Testing

### Visual Regression Testing
- Use tools like Percy or Chromatic
- Test components in isolation
- Test responsive breakpoints

### Accessibility Testing
- Use axe-core for automated testing
- Manual keyboard navigation testing
- Screen reader testing

### Performance Testing
- Lighthouse audits
- Bundle size monitoring
- Runtime performance testing

## Deployment

### Build Process
1. Compile Sass/CSS
2. Minify and optimize assets
3. Generate component documentation
4. Run tests and quality checks
5. Deploy to CDN or hosting platform

### Version Control
- Use semantic versioning (semver)
- Maintain changelog
- Create release notes
- Tag releases in Git

## Maintenance

### Regular Updates
- Monitor for security vulnerabilities
- Update dependencies regularly
- Review and update design tokens
- Conduct accessibility audits

### Community Guidelines
- Contribute new components through pull requests
- Follow established coding standards
- Document all changes
- Test thoroughly before submitting
"""
    
    def _generate_style_guide(self, design_assets: DesignAssets) -> str:
        """Generate comprehensive style guide"""
        
        return f"""# Style Guide

## Brand Identity

### Logo Usage
- Primary logo for main brand applications
- Secondary logo for space-constrained areas
- Icon-only version for social media and favicons
- Minimum size: 24px height for digital, 0.5 inch for print

### Color Palette
**Primary Colors:**
- Primary: {design_assets.brand_identity.get('color_palette', {}).get('primary', '#007bff')}
- Secondary: {design_assets.brand_identity.get('color_palette', {}).get('secondary', '#6c757d')}

**Semantic Colors:**
- Success: #28a745
- Warning: #ffc107
- Danger: #dc3545
- Info: #17a2b8

**Neutral Colors:**
- Gray scale from #f8f9fa to #212529
- High contrast ratios for accessibility

### Typography
**Font Hierarchy:**
- Heading 1: 3rem (48px) - Page titles
- Heading 2: 2.25rem (36px) - Section headers
- Heading 3: 1.875rem (30px) - Subsection headers
- Heading 4: 1.5rem (24px) - Component titles
- Body: 1rem (16px) - Regular content
- Small: 0.875rem (14px) - Captions and labels

## Layout Principles

### Grid System
- 12-column responsive grid
- Container max-width: 1200px
- Gutter width: 24px
- Responsive breakpoints at 576px, 768px, 992px, 1200px

### Spacing System
- Base unit: 4px
- Scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px
- Consistent vertical rhythm
- Proportional spacing relationships

### Component Guidelines
- Consistent padding and margins
- Logical tab order for accessibility
- Hover and focus states for all interactive elements
- Loading and error states

## Content Guidelines

### Voice and Tone
- Professional yet approachable
- Clear and concise language
- Action-oriented messaging
- Consistent terminology

### Writing Style
- Active voice preferred
- Short sentences and paragraphs
- Bullet points for lists
- Clear call-to-action labels

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Color contrast ratio minimum 4.5:1
- Text resizable up to 200%
- Keyboard navigation support
- Screen reader compatibility

### Implementation
- Semantic HTML structure
- ARIA labels and descriptions
- Focus management
- Alternative text for images
"""
    
    def _generate_usage_examples(self, design_assets: DesignAssets) -> Dict[str, str]:
        """Generate usage examples"""
        
        return {
            "landing_page": """<!-- Landing Page Example -->
<div class="hero-section">
  <div class="container">
    <div class="row">
      <div class="col">
        <h1 class="hero-title">Welcome to Our Platform</h1>
        <p class="hero-subtitle">Experience the future of digital solutions</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg">Get Started</button>
          <button class="btn btn-outline btn-lg">Learn More</button>
        </div>
      </div>
    </div>
  </div>
</div>""",
            
            "dashboard": """<!-- Dashboard Layout Example -->
<div class="dashboard">
  <nav class="sidebar">
    <div class="sidebar-header">
      <img src="logo.svg" alt="Logo" class="sidebar-logo">
    </div>
    <ul class="sidebar-nav">
      <li><a href="#" class="active">Dashboard</a></li>
      <li><a href="#">Analytics</a></li>
      <li><a href="#">Settings</a></li>
    </ul>
  </nav>
  
  <main class="main-content">
    <header class="content-header">
      <h1>Dashboard</h1>
      <button class="btn btn-primary">New Item</button>
    </header>
    
    <div class="content-grid">
      <div class="card">
        <div class="card-body">
          <h3>Metric 1</h3>
          <p class="metric-value">1,234</p>
        </div>
      </div>
      <!-- More cards -->
    </div>
  </main>
</div>""",
            
            "form": """<!-- Form Example -->
<form class="form-card">
  <div class="form-header">
    <h2>Contact Us</h2>
    <p>We'd love to hear from you</p>
  </div>
  
  <div class="form-body">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="firstName">First Name</label>
        <input class="form-input" type="text" id="firstName" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="lastName">Last Name</label>
        <input class="form-input" type="text" id="lastName" required>
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label" for="email">Email</label>
      <input class="form-input" type="email" id="email" required>
    </div>
    
    <div class="form-group">
      <label class="form-label" for="message">Message</label>
      <textarea class="form-input" id="message" rows="4" required></textarea>
    </div>
  </div>
  
  <div class="form-footer">
    <button class="btn btn-primary" type="submit">Send Message</button>
    <button class="btn btn-secondary" type="reset">Reset</button>
  </div>
</form>"""
        }

# Module initialization
visual_design_module = VisualDesignModule()

if __name__ == "__main__":
    async def main():
        design_system = VisualDesignModule()
        
        # Example queries
        queries = [
            "Create a modern tech startup brand with clean UI for a SaaS platform",
            "Design a luxury hotel website with elegant branding and mobile-first layout",
            "Generate a healthcare app interface with accessible design and calming colors",
            "Create a bold creative agency portfolio with dynamic layouts and animations"
        ]
        
        for query in queries:
            print(f"\n{'='*60}")
            print(f"Processing: {query}")
            print(f"{'='*60}")
            
            result = await design_system.process_query(query)
            
            print(f"\n🎨 Generated complete design system")
            print(f"📋 Project: {result['requirements']['project_name']}")
            print(f"🏭 Industry: {result['requirements']['industry']}")
            print(f"✨ Style: {result['requirements']['design_style']}")
            print(f"🎯 Brand Values: {', '.join(result['requirements']['brand_values'])}")
            
            # Show generated assets
            assets = result['design_assets']
            print(f"\n📁 Generated Assets:")
            print(f"   🎨 Brand Identity: {len(assets['brand_identity'])} components")
            print(f"   📱 UI Layouts: {len(assets['ui_layouts'])} layouts")
            print(f"   🖥️ Mockups: {len(assets['mockups'])} mockups")
            print(f"   ⚡ Optimized Assets: {len(assets['assets'])} files")
            print(f"   📖 Style Guide: {len(assets['style_guide'])} sections")
            print(f"   💻 Code Snippets: {len(assets['code_snippets'])} files")
    
    # Run the example
    asyncio.run(main())
