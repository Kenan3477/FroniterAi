"""
Responsive UI Layout Generator

Creates responsive UI layouts based on UX best practices including:
- Mobile-first responsive designs
- Grid systems and spacing
- Component libraries
- Navigation patterns and UX flows
"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class LayoutType(Enum):
    """Layout pattern types"""
    SINGLE_COLUMN = "single_column"
    TWO_COLUMN = "two_column"
    THREE_COLUMN = "three_column"
    GRID = "grid"
    MASONRY = "masonry"
    HERO_CONTENT = "hero_content"
    DASHBOARD = "dashboard"
    LANDING_PAGE = "landing_page"
    BLOG = "blog"
    ECOMMERCE = "ecommerce"

class NavigationType(Enum):
    """Navigation pattern types"""
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    HAMBURGER = "hamburger"
    TAB_BAR = "tab_bar"
    BREADCRUMB = "breadcrumb"
    MEGA_MENU = "mega_menu"
    SIDEBAR = "sidebar"

class ComponentType(Enum):
    """UI component types"""
    BUTTON = "button"
    CARD = "card"
    FORM = "form"
    MODAL = "modal"
    NAVIGATION = "navigation"
    HERO = "hero"
    FOOTER = "footer"
    SIDEBAR = "sidebar"
    GRID = "grid"
    LIST = "list"

@dataclass
class Breakpoint:
    """Responsive breakpoint definition"""
    name: str
    min_width: int
    max_width: Optional[int] = None
    container_width: Optional[int] = None

@dataclass
class GridSystem:
    """CSS Grid system configuration"""
    columns: int
    gutter: str
    container_max_width: str
    breakpoints: List[Breakpoint]

class ResponsiveLayoutGenerator:
    """
    Comprehensive responsive layout generator that creates:
    - Mobile-first responsive designs
    - Flexible grid systems
    - Accessible navigation patterns
    - Reusable component libraries
    - Optimized UX flows
    """
    
    def __init__(self):
        self.breakpoints = self._initialize_breakpoints()
        self.grid_system = self._initialize_grid_system()
        self.component_library = self._initialize_component_library()
        self.ux_patterns = self._initialize_ux_patterns()
        
    async def generate_layouts(self, requirements, brand_identity: Dict) -> Dict[str, Any]:
        """Generate complete responsive layout system"""
        
        # Generate grid system
        grid_system = await self._generate_grid_system(requirements)
        
        # Generate component library
        components = await self._generate_component_library(requirements, brand_identity)
        
        # Generate layout templates
        layouts = await self._generate_layout_templates(requirements, brand_identity)
        
        # Generate navigation patterns
        navigation = await self._generate_navigation_patterns(requirements, brand_identity)
        
        # Generate responsive utilities
        responsive_utils = await self._generate_responsive_utilities(requirements)
        
        return {
            "grid_system": grid_system,
            "components": components,
            "layouts": layouts,
            "navigation": navigation,
            "responsive_utilities": responsive_utils,
            "layout_principles": self._generate_layout_principles(requirements),
            "spacing": self._generate_spacing_system(requirements),
            "breakpoints": self.breakpoints
        }
    
    async def _generate_grid_system(self, requirements) -> Dict[str, Any]:
        """Generate flexible grid system"""
        
        return {
            "css_grid": {
                "container": {
                    "display": "grid",
                    "grid_template_columns": "repeat(12, 1fr)",
                    "gap": "1.5rem",
                    "max_width": "1200px",
                    "margin": "0 auto",
                    "padding": "0 1rem"
                },
                "responsive_columns": {
                    "mobile": "grid-template-columns: 1fr",
                    "tablet": "grid-template-columns: repeat(6, 1fr)",
                    "desktop": "grid-template-columns: repeat(12, 1fr)"
                }
            },
            "flexbox_grid": {
                "container": {
                    "display": "flex",
                    "flex_wrap": "wrap",
                    "margin": "0 -0.75rem"
                },
                "column": {
                    "padding": "0 0.75rem",
                    "flex": "1 0 auto"
                },
                "responsive_widths": {
                    "col_12": "flex: 0 0 100%",
                    "col_6": "flex: 0 0 50%",
                    "col_4": "flex: 0 0 33.333333%",
                    "col_3": "flex: 0 0 25%"
                }
            },
            "container_queries": {
                "small": "@container (max-width: 400px)",
                "medium": "@container (min-width: 401px) and (max-width: 800px)",
                "large": "@container (min-width: 801px)"
            }
        }
    
    async def _generate_component_library(self, requirements, brand_identity: Dict) -> Dict[str, Any]:
        """Generate comprehensive component library"""
        
        primary_color = brand_identity.get("color_palette", {}).get("primary", "#007bff")
        secondary_color = brand_identity.get("color_palette", {}).get("secondary", "#6c757d")
        
        components = {}
        
        # Button Components
        components["buttons"] = {
            "primary": f"""
.btn-primary {{
  background-color: {primary_color};
  color: white;
  border: 2px solid {primary_color};
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
}}

.btn-primary:hover {{
  background-color: color-mix(in srgb, {primary_color} 85%, black);
  border-color: color-mix(in srgb, {primary_color} 85%, black);
  transform: translateY(-1px);
}}

.btn-primary:focus {{
  outline: 2px solid {primary_color};
  outline-offset: 2px;
}}

.btn-primary:active {{
  transform: translateY(0);
}}""",
            
            "secondary": f"""
.btn-secondary {{
  background-color: transparent;
  color: {primary_color};
  border: 2px solid {primary_color};
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  cursor: pointer;
}}

.btn-secondary:hover {{
  background-color: {primary_color};
  color: white;
}}""",
            
            "sizes": {
                "small": "padding: 0.5rem 1rem; font-size: 0.875rem;",
                "medium": "padding: 0.75rem 1.5rem; font-size: 1rem;",
                "large": "padding: 1rem 2rem; font-size: 1.125rem;"
            }
        }
        
        # Card Components
        components["cards"] = {
            "basic": """
.card {{
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}}

.card:hover {{
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}}

.card-header {{
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}}

.card-body {{
  padding: 1.5rem;
}}

.card-footer {{
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}}""",
            
            "product": f"""
.product-card {{
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}}

.product-card:hover {{
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}}

.product-image {{
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.3s ease;
}}

.product-card:hover .product-image {{
  transform: scale(1.05);
}}

.product-info {{
  padding: 1.5rem;
}}

.product-title {{
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1f2937;
}}

.product-price {{
  font-size: 1.25rem;
  font-weight: 700;
  color: {primary_color};
}}""",
            
            "testimonial": """
.testimonial-card {{
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  position: relative;
}}

.testimonial-quote {{
  font-size: 1.125rem;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 1.5rem;
  font-style: italic;
}}

.testimonial-author {{
  display: flex;
  align-items: center;
  gap: 1rem;
}}

.author-avatar {{
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
}}

.author-info h4 {{
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}}

.author-info p {{
  color: #6b7280;
  margin: 0;
  font-size: 0.875rem;
}}"""
        }
        
        # Form Components
        components["forms"] = {
            "input": f"""
.form-group {{
  margin-bottom: 1.5rem;
}}

.form-label {{
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}}

.form-input {{
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: white;
}}

.form-input:focus {{
  outline: none;
  border-color: {primary_color};
  box-shadow: 0 0 0 3px color-mix(in srgb, {primary_color} 10%, transparent);
}}

.form-input:invalid {{
  border-color: #ef4444;
}}

.form-error {{
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}}

.form-help {{
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}}""",
            
            "select": """
.form-select {{
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}}""",
            
            "checkbox": f"""
.form-checkbox {{
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}}

.form-checkbox input[type="checkbox"] {{
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}}

.form-checkbox input[type="checkbox"]:checked {{
  background-color: {primary_color};
  border-color: {primary_color};
  background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e");
}}

.form-checkbox input[type="checkbox"]:focus {{
  outline: 2px solid {primary_color};
  outline-offset: 2px;
}}"""
        }
        
        # Navigation Components
        components["navigation"] = {
            "header": f"""
.header {{
  background: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 50;
}}

.navbar {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}}

.navbar-brand {{
  font-size: 1.5rem;
  font-weight: 700;
  color: {primary_color};
  text-decoration: none;
}}

.navbar-nav {{
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 2rem;
}}

.navbar-nav a {{
  color: #374151;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}}

.navbar-nav a:hover,
.navbar-nav a.active {{
  color: {primary_color};
}}

.navbar-nav a.active::after {{
  content: '';
  position: absolute;
  bottom: -0.5rem;
  left: 0;
  right: 0;
  height: 2px;
  background-color: {primary_color};
}}

@media (max-width: 768px) {{
  .navbar-nav {{
    display: none;
  }}
  
  .mobile-menu-button {{
    display: block;
  }}
}}""",
            
            "breadcrumb": """
.breadcrumb {{
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
}}

.breadcrumb-item {{
  color: #6b7280;
}}

.breadcrumb-item a {{
  color: #6b7280;
  text-decoration: none;
  transition: color 0.2s ease;
}}

.breadcrumb-item a:hover {{
  color: #374151;
}}

.breadcrumb-item.active {{
  color: #374151;
  font-weight: 500;
}}

.breadcrumb-separator {{
  color: #d1d5db;
}}""",
            
            "sidebar": f"""
.sidebar {{
  width: 250px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e5e7eb;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 40;
}}

.sidebar-header {{
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}}

.sidebar-nav {{
  padding: 1rem 0;
}}

.sidebar-nav ul {{
  list-style: none;
  margin: 0;
  padding: 0;
}}

.sidebar-nav a {{
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: #374151;
  text-decoration: none;
  transition: all 0.2s ease;
}}

.sidebar-nav a:hover,
.sidebar-nav a.active {{
  background-color: color-mix(in srgb, {primary_color} 10%, transparent);
  color: {primary_color};
  border-right: 3px solid {primary_color};
}}

.main-content {{
  margin-left: 250px;
  padding: 2rem;
}}

@media (max-width: 768px) {{
  .sidebar {{
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }}
  
  .sidebar.open {{
    transform: translateX(0);
  }}
  
  .main-content {{
    margin-left: 0;
  }}
}}"""
        }
        
        return components
    
    async def _generate_layout_templates(self, requirements, brand_identity: Dict) -> Dict[str, Any]:
        """Generate layout templates for different page types"""
        
        templates = {}
        
        # Landing Page Layout
        templates["landing_page"] = {
            "structure": """
<div class="landing-page">
  <header class="hero-section">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">Compelling Headline</h1>
        <p class="hero-subtitle">Supporting description that explains the value proposition</p>
        <div class="hero-actions">
          <button class="btn btn-primary">Primary CTA</button>
          <button class="btn btn-secondary">Secondary CTA</button>
        </div>
      </div>
      <div class="hero-image">
        <img src="hero-image.jpg" alt="Hero image" />
      </div>
    </div>
  </header>
  
  <section class="features-section">
    <div class="container">
      <h2 class="section-title">Key Features</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Feature 1</h3>
          <p>Description of the feature and its benefits</p>
        </div>
        <!-- More feature cards -->
      </div>
    </div>
  </section>
  
  <section class="testimonials-section">
    <div class="container">
      <h2 class="section-title">What Our Customers Say</h2>
      <div class="testimonials-grid">
        <!-- Testimonial cards -->
      </div>
    </div>
  </section>
  
  <section class="cta-section">
    <div class="container">
      <div class="cta-content">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of satisfied customers</p>
        <button class="btn btn-primary">Start Free Trial</button>
      </div>
    </div>
  </section>
</div>""",
            
            "css": """
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 0;
  min-height: 80vh;
  display: flex;
  align-items: center;
}

.hero-content {
  max-width: 50%;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.features-section {
  padding: 5rem 0;
  background: #f9fafb;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .hero-content {
    max-width: 100%;
    text-align: center;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    justify-content: center;
  }
}"""
        }
        
        # Dashboard Layout
        templates["dashboard"] = {
            "structure": """
<div class="dashboard-layout">
  <aside class="sidebar">
    <div class="sidebar-header">
      <img src="logo.svg" alt="Logo" class="sidebar-logo">
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li><a href="#" class="active">Dashboard</a></li>
        <li><a href="#">Analytics</a></li>
        <li><a href="#">Users</a></li>
        <li><a href="#">Settings</a></li>
      </ul>
    </nav>
  </aside>
  
  <main class="main-content">
    <header class="content-header">
      <h1 class="page-title">Dashboard</h1>
      <div class="header-actions">
        <button class="btn btn-primary">New Item</button>
      </div>
    </header>
    
    <div class="content-grid">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">1,234</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$12,345</div>
          <div class="stat-label">Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">98%</div>
          <div class="stat-label">Satisfaction</div>
        </div>
      </div>
      
      <div class="charts-row">
        <div class="chart-card">
          <h3>Analytics Chart</h3>
          <div class="chart-placeholder">[Chart Component]</div>
        </div>
      </div>
      
      <div class="data-table-card">
        <h3>Recent Activity</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <!-- Table rows -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</div>""",
            
            "css": """
.dashboard-layout {
  display: flex;
  min-height: 100vh;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.content-grid {
  display: grid;
  gap: 2rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.chart-card,
.data-table-card {
  background: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  font-weight: 600;
  color: #374151;
  background-color: #f9fafb;
}"""
        }
        
        # Blog Layout
        templates["blog"] = {
            "structure": """
<div class="blog-layout">
  <header class="blog-header">
    <div class="container">
      <h1 class="blog-title">Blog</h1>
      <p class="blog-subtitle">Insights and updates from our team</p>
    </div>
  </header>
  
  <div class="blog-content">
    <div class="container">
      <div class="blog-grid">
        <main class="blog-main">
          <article class="blog-post-card">
            <div class="post-image">
              <img src="post-image.jpg" alt="Post image" />
            </div>
            <div class="post-content">
              <div class="post-meta">
                <span class="post-category">Technology</span>
                <span class="post-date">March 15, 2025</span>
              </div>
              <h2 class="post-title">
                <a href="#">How to Build Better User Experiences</a>
              </h2>
              <p class="post-excerpt">
                Learn the key principles of UX design that will help you create 
                more engaging and effective user interfaces.
              </p>
              <div class="post-author">
                <img src="author.jpg" alt="Author" class="author-avatar" />
                <span class="author-name">Jane Doe</span>
              </div>
            </div>
          </article>
          
          <!-- More blog post cards -->
        </main>
        
        <aside class="blog-sidebar">
          <div class="sidebar-widget">
            <h3>Categories</h3>
            <ul class="category-list">
              <li><a href="#">Technology</a></li>
              <li><a href="#">Design</a></li>
              <li><a href="#">Business</a></li>
            </ul>
          </div>
          
          <div class="sidebar-widget">
            <h3>Recent Posts</h3>
            <div class="recent-posts">
              <div class="recent-post">
                <h4><a href="#">Recent Post Title</a></h4>
                <span class="recent-post-date">March 10, 2025</span>
              </div>
              <!-- More recent posts -->
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</div>""",
            
            "css": """
.blog-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 0;
  text-align: center;
}

.blog-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.blog-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
}

.blog-content {
  padding: 4rem 0;
}

.blog-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
}

.blog-post-card {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  transition: transform 0.2s ease;
}

.blog-post-card:hover {
  transform: translateY(-2px);
}

.post-image img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-content {
  padding: 1.5rem;
}

.post-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.post-category {
  background: #e5e7eb;
  color: #374151;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-weight: 500;
}

.post-date {
  color: #6b7280;
}

.post-title a {
  color: #1f2937;
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: 600;
}

.post-title a:hover {
  color: #4f46e5;
}

.post-excerpt {
  color: #6b7280;
  line-height: 1.6;
  margin: 1rem 0;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
}

.blog-sidebar {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 1rem;
  height: fit-content;
}

.sidebar-widget {
  margin-bottom: 2rem;
}

.sidebar-widget h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-list li {
  margin-bottom: 0.5rem;
}

.category-list a {
  color: #6b7280;
  text-decoration: none;
  transition: color 0.2s ease;
}

.category-list a:hover {
  color: #4f46e5;
}

@media (max-width: 768px) {
  .blog-grid {
    grid-template-columns: 1fr;
  }
  
  .blog-title {
    font-size: 2rem;
  }
}"""
        }
        
        return templates
    
    async def _generate_navigation_patterns(self, requirements, brand_identity: Dict) -> Dict[str, Any]:
        """Generate navigation patterns"""
        
        return {
            "desktop_navigation": {
                "horizontal_navbar": "Standard horizontal navigation bar",
                "mega_menu": "Dropdown menu for complex site structures",
                "sticky_header": "Navigation that stays visible on scroll"
            },
            "mobile_navigation": {
                "hamburger_menu": "Collapsible hamburger menu for mobile",
                "tab_bar": "Bottom tab bar for app-like navigation",
                "slide_out_menu": "Side navigation that slides in from edge"
            },
            "breadcrumb_navigation": {
                "hierarchical": "Shows page hierarchy and location",
                "attribute_based": "Shows user's path through filters"
            },
            "pagination": {
                "numbered": "Traditional numbered pagination",
                "load_more": "Load more button for progressive loading",
                "infinite_scroll": "Automatic content loading on scroll"
            }
        }
    
    async def _generate_responsive_utilities(self, requirements) -> Dict[str, Any]:
        """Generate responsive utility classes"""
        
        return {
            "visibility": {
                "hidden_mobile": "@media (max-width: 767px) { display: none; }",
                "hidden_tablet": "@media (min-width: 768px) and (max-width: 1023px) { display: none; }",
                "hidden_desktop": "@media (min-width: 1024px) { display: none; }",
                "visible_mobile": "@media (min-width: 768px) { display: none; }",
                "visible_tablet": "@media (max-width: 767px), (min-width: 1024px) { display: none; }",
                "visible_desktop": "@media (max-width: 1023px) { display: none; }"
            },
            "spacing": {
                "responsive_padding": """
.p-responsive {
  padding: 1rem;
}
@media (min-width: 768px) {
  .p-responsive { padding: 2rem; }
}
@media (min-width: 1024px) {
  .p-responsive { padding: 3rem; }
}""",
                "responsive_margin": """
.m-responsive {
  margin: 1rem;
}
@media (min-width: 768px) {
  .m-responsive { margin: 2rem; }
}
@media (min-width: 1024px) {
  .m-responsive { margin: 3rem; }
}"""
            },
            "typography": {
                "responsive_text": """
.text-responsive {
  font-size: 1rem;
  line-height: 1.5;
}
@media (min-width: 768px) {
  .text-responsive {
    font-size: 1.125rem;
    line-height: 1.6;
  }
}
@media (min-width: 1024px) {
  .text-responsive {
    font-size: 1.25rem;
    line-height: 1.7;
  }
}""",
                "responsive_headings": """
.heading-responsive {
  font-size: 1.5rem;
}
@media (min-width: 768px) {
  .heading-responsive { font-size: 2rem; }
}
@media (min-width: 1024px) {
  .heading-responsive { font-size: 2.5rem; }
}"""
            }
        }
    
    def _generate_layout_principles(self, requirements) -> Dict[str, str]:
        """Generate layout design principles"""
        
        return {
            "mobile_first": "Design for mobile devices first, then progressively enhance for larger screens",
            "content_hierarchy": "Establish clear visual hierarchy with typography, spacing, and color",
            "white_space": "Use white space effectively to create breathing room and focus",
            "consistency": "Maintain consistent spacing, alignment, and component behavior",
            "accessibility": "Ensure all layouts are accessible via keyboard and screen readers",
            "performance": "Optimize layouts for fast loading and smooth interactions",
            "flexibility": "Create flexible layouts that adapt to different content lengths",
            "touch_targets": "Ensure interactive elements are large enough for touch interaction"
        }
    
    def _generate_spacing_system(self, requirements) -> Dict[str, Any]:
        """Generate consistent spacing system"""
        
        return {
            "base_unit": "4px",
            "scale": {
                "xs": "4px",
                "sm": "8px",
                "md": "16px",
                "lg": "24px",
                "xl": "32px",
                "2xl": "48px",
                "3xl": "64px",
                "4xl": "96px"
            },
            "css_variables": """
:root {
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
  --spacing-4xl: 6rem;     /* 96px */
}""",
            "utility_classes": """
/* Margin utilities */
.m-xs { margin: var(--spacing-xs); }
.m-sm { margin: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
.m-lg { margin: var(--spacing-lg); }
.m-xl { margin: var(--spacing-xl); }

/* Padding utilities */
.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
.p-xl { padding: var(--spacing-xl); }

/* Gap utilities for flexbox/grid */
.gap-xs { gap: var(--spacing-xs); }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }"""
        }
    
    def _initialize_breakpoints(self) -> List[Breakpoint]:
        """Initialize responsive breakpoints"""
        
        return [
            Breakpoint("xs", 0, 575, 100),
            Breakpoint("sm", 576, 767, 540),
            Breakpoint("md", 768, 991, 720),
            Breakpoint("lg", 992, 1199, 960),
            Breakpoint("xl", 1200, 1399, 1140),
            Breakpoint("xxl", 1400, None, 1320)
        ]
    
    def _initialize_grid_system(self) -> GridSystem:
        """Initialize grid system configuration"""
        
        return GridSystem(
            columns=12,
            gutter="1.5rem",
            container_max_width="1200px",
            breakpoints=self.breakpoints
        )
    
    def _initialize_component_library(self) -> Dict[str, Any]:
        """Initialize component library structure"""
        
        return {
            "buttons": ["primary", "secondary", "outline", "ghost", "link"],
            "forms": ["input", "textarea", "select", "checkbox", "radio", "switch"],
            "navigation": ["navbar", "breadcrumb", "pagination", "tabs", "sidebar"],
            "layout": ["container", "grid", "stack", "cluster", "sidebar"],
            "feedback": ["alert", "toast", "modal", "tooltip", "popover"],
            "data_display": ["table", "card", "list", "avatar", "badge"]
        }
    
    def _initialize_ux_patterns(self) -> Dict[str, Any]:
        """Initialize UX pattern library"""
        
        return {
            "onboarding": ["progressive_disclosure", "guided_tour", "empty_states"],
            "forms": ["multi_step", "inline_validation", "smart_defaults"],
            "navigation": ["mega_menu", "faceted_search", "breadcrumb_trails"],
            "content": ["infinite_scroll", "lazy_loading", "progressive_enhancement"],
            "feedback": ["loading_states", "error_handling", "success_confirmation"]
        }
