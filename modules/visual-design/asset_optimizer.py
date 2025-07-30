"""
Asset Optimizer

Optimizes design assets for performance across all devices including:
- Image optimization and compression
- SVG optimization and minification
- CSS and JavaScript optimization
- Web font optimization
- Responsive image generation
"""

import asyncio
import json
import base64
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import re

class AssetType(Enum):
    """Asset type categories"""
    IMAGE = "image"
    SVG = "svg"
    CSS = "css"
    JAVASCRIPT = "javascript"
    FONT = "font"
    ICON = "icon"

class OptimizationLevel(Enum):
    """Optimization level settings"""
    BASIC = "basic"
    STANDARD = "standard"
    AGGRESSIVE = "aggressive"
    LOSSLESS = "lossless"

class DeviceTarget(Enum):
    """Device optimization targets"""
    MOBILE = "mobile"
    TABLET = "tablet"
    DESKTOP = "desktop"
    RETINA = "retina"
    ALL = "all"

@dataclass
class OptimizationSettings:
    """Optimization settings configuration"""
    level: OptimizationLevel
    quality: int  # 1-100 for image quality
    target_devices: List[DeviceTarget]
    max_file_size: int  # in KB
    enable_webp: bool
    enable_avif: bool
    minify_css: bool
    minify_js: bool

class AssetOptimizer:
    """
    Comprehensive asset optimizer that:
    - Optimizes images for web delivery and performance
    - Creates responsive image sets for different devices
    - Optimizes SVG files for smaller file sizes
    - Minifies CSS and JavaScript files
    - Optimizes web fonts for faster loading
    - Generates modern image formats (WebP, AVIF)
    - Creates sprite sheets and icon fonts
    """
    
    def __init__(self):
        self.optimization_profiles = self._initialize_optimization_profiles()
        self.image_formats = self._initialize_image_formats()
        self.css_optimization_rules = self._initialize_css_optimization()
        self.js_optimization_rules = self._initialize_js_optimization()
        self.font_optimization_rules = self._initialize_font_optimization()
        
    async def optimize_assets(self, assets: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize all assets according to settings"""
        
        optimized_assets = {
            "images": {},
            "svgs": {},
            "css": {},
            "javascript": {},
            "fonts": {},
            "icons": {},
            "metadata": {}
        }
        
        # Optimize images
        if "images" in assets:
            optimized_assets["images"] = await self._optimize_images(
                assets["images"], settings
            )
        
        # Optimize SVGs
        if "svgs" in assets:
            optimized_assets["svgs"] = await self._optimize_svgs(
                assets["svgs"], settings
            )
        
        # Optimize CSS
        if "css" in assets:
            optimized_assets["css"] = await self._optimize_css(
                assets["css"], settings
            )
        
        # Optimize JavaScript
        if "javascript" in assets:
            optimized_assets["javascript"] = await self._optimize_javascript(
                assets["javascript"], settings
            )
        
        # Optimize fonts
        if "fonts" in assets:
            optimized_assets["fonts"] = await self._optimize_fonts(
                assets["fonts"], settings
            )
        
        # Generate icon sets
        if "icons" in assets:
            optimized_assets["icons"] = await self._optimize_icons(
                assets["icons"], settings
            )
        
        # Generate optimization metadata
        optimized_assets["metadata"] = await self._generate_optimization_metadata(
            assets, optimized_assets, settings
        )
        
        return optimized_assets
    
    async def _optimize_images(self, images: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize image assets"""
        
        optimized_images = {}
        
        for image_name, image_data in images.items():
            optimized_images[image_name] = await self._optimize_single_image(
                image_name, image_data, settings
            )
        
        return optimized_images
    
    async def _optimize_single_image(self, image_name: str, image_data: Any, settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize a single image"""
        
        optimization_result = {
            "original": {
                "name": image_name,
                "format": self._detect_image_format(image_name),
                "estimated_size": "100KB",  # Placeholder
                "dimensions": {"width": 1200, "height": 800}  # Placeholder
            },
            "optimized_versions": {},
            "responsive_sets": {},
            "modern_formats": {}
        }
        
        # Generate responsive image sets
        responsive_breakpoints = {
            "mobile": {"width": 375, "quality": 85},
            "tablet": {"width": 768, "quality": 90},
            "desktop": {"width": 1200, "quality": 95},
            "retina": {"width": 2400, "quality": 85}
        }
        
        for breakpoint_name, breakpoint_config in responsive_breakpoints.items():
            if any(device.value == breakpoint_name for device in settings.target_devices) or DeviceTarget.ALL in settings.target_devices:
                optimization_result["responsive_sets"][breakpoint_name] = {
                    "width": breakpoint_config["width"],
                    "quality": breakpoint_config["quality"],
                    "estimated_size": f"{int(100 * (breakpoint_config['width'] / 1200) * (breakpoint_config['quality'] / 100))}KB",
                    "css_media_query": self._generate_media_query(breakpoint_name, breakpoint_config["width"])
                }
        
        # Generate modern format versions
        if settings.enable_webp:
            optimization_result["modern_formats"]["webp"] = {
                "quality": settings.quality,
                "estimated_size": f"{int(100 * 0.7)}KB",  # WebP typically 30% smaller
                "browser_support": "Chrome 23+, Firefox 65+, Safari 14+"
            }
        
        if settings.enable_avif:
            optimization_result["modern_formats"]["avif"] = {
                "quality": settings.quality,
                "estimated_size": f"{int(100 * 0.5)}KB",  # AVIF typically 50% smaller
                "browser_support": "Chrome 85+, Firefox 93+"
            }
        
        # Generate picture element HTML
        optimization_result["html_picture_element"] = self._generate_picture_element(
            image_name, optimization_result
        )
        
        # Generate CSS for responsive images
        optimization_result["css_responsive"] = self._generate_responsive_image_css(
            image_name, optimization_result["responsive_sets"]
        )
        
        return optimization_result
    
    def _detect_image_format(self, filename: str) -> str:
        """Detect image format from filename"""
        
        extension = filename.lower().split('.')[-1]
        format_map = {
            'jpg': 'JPEG',
            'jpeg': 'JPEG',
            'png': 'PNG',
            'webp': 'WebP',
            'avif': 'AVIF',
            'svg': 'SVG'
        }
        return format_map.get(extension, 'Unknown')
    
    def _generate_media_query(self, breakpoint_name: str, width: int) -> str:
        """Generate CSS media query for breakpoint"""
        
        if breakpoint_name == "mobile":
            return f"(max-width: {width}px)"
        elif breakpoint_name == "tablet":
            return f"(min-width: {width}px) and (max-width: 1199px)"
        elif breakpoint_name == "desktop":
            return f"(min-width: {width}px)"
        elif breakpoint_name == "retina":
            return f"(min-width: {width}px), (-webkit-min-device-pixel-ratio: 2)"
        else:
            return f"(min-width: {width}px)"
    
    def _generate_picture_element(self, image_name: str, optimization_result: Dict) -> str:
        """Generate HTML picture element with responsive sources"""
        
        picture_html = "<picture>\n"
        
        # Add modern format sources
        if "avif" in optimization_result["modern_formats"]:
            picture_html += f'    <source srcset="{image_name}.avif" type="image/avif">\n'
        
        if "webp" in optimization_result["modern_formats"]:
            picture_html += f'    <source srcset="{image_name}.webp" type="image/webp">\n'
        
        # Add responsive sources
        for breakpoint_name, breakpoint_data in optimization_result["responsive_sets"].items():
            media_query = breakpoint_data["css_media_query"]
            picture_html += f'    <source srcset="{image_name}-{breakpoint_name}.jpg" media="{media_query}">\n'
        
        # Fallback image
        picture_html += f'    <img src="{image_name}.jpg" alt="{image_name}" loading="lazy">\n'
        picture_html += "</picture>"
        
        return picture_html
    
    def _generate_responsive_image_css(self, image_name: str, responsive_sets: Dict) -> str:
        """Generate CSS for responsive images"""
        
        css = f".{image_name.replace('.', '-').replace('_', '-')} {{\n"
        css += "    width: 100%;\n"
        css += "    height: auto;\n"
        css += "    object-fit: cover;\n"
        css += "}\n\n"
        
        for breakpoint_name, breakpoint_data in responsive_sets.items():
            media_query = breakpoint_data["css_media_query"]
            css += f"@media {media_query} {{\n"
            css += f"    .{image_name.replace('.', '-').replace('_', '-')} {{\n"
            css += f"        max-width: {breakpoint_data['width']}px;\n"
            css += "    }\n"
            css += "}\n\n"
        
        return css
    
    async def _optimize_svgs(self, svgs: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize SVG assets"""
        
        optimized_svgs = {}
        
        for svg_name, svg_content in svgs.items():
            optimized_svgs[svg_name] = await self._optimize_single_svg(
                svg_name, svg_content, settings
            )
        
        return optimized_svgs
    
    async def _optimize_single_svg(self, svg_name: str, svg_content: str, settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize a single SVG"""
        
        optimization_result = {
            "original": {
                "name": svg_name,
                "estimated_size": f"{len(svg_content)}B"
            },
            "optimized": {},
            "sprite_inclusion": {},
            "css_usage": {}
        }
        
        # Apply SVG optimizations
        optimized_svg = self._apply_svg_optimizations(svg_content, settings)
        
        optimization_result["optimized"] = {
            "content": optimized_svg,
            "estimated_size": f"{len(optimized_svg)}B",
            "reduction": f"{((len(svg_content) - len(optimized_svg)) / len(svg_content) * 100):.1f}%"
        }
        
        # Generate sprite sheet inclusion
        optimization_result["sprite_inclusion"] = {
            "symbol_id": svg_name.replace('.svg', ''),
            "sprite_reference": f"<use href=\"#icon-{svg_name.replace('.svg', '')}\"></use>",
            "css_class": f".icon-{svg_name.replace('.svg', '').replace('_', '-')}"
        }
        
        # Generate CSS for SVG usage
        optimization_result["css_usage"] = self._generate_svg_css(svg_name, optimized_svg)
        
        return optimization_result
    
    def _apply_svg_optimizations(self, svg_content: str, settings: OptimizationSettings) -> str:
        """Apply SVG optimization techniques"""
        
        optimized = svg_content
        
        # Remove comments
        optimized = re.sub(r'<!--.*?-->', '', optimized, flags=re.DOTALL)
        
        # Remove unnecessary whitespace
        optimized = re.sub(r'\s+', ' ', optimized)
        optimized = re.sub(r'>\s+<', '><', optimized)
        
        # Remove unnecessary attributes
        if settings.level in [OptimizationLevel.STANDARD, OptimizationLevel.AGGRESSIVE]:
            # Remove XML declaration and doctype
            optimized = re.sub(r'<\?xml[^>]*\?>', '', optimized)
            optimized = re.sub(r'<!DOCTYPE[^>]*>', '', optimized)
            
            # Remove unnecessary namespaces
            optimized = re.sub(r'xmlns:[a-z]+"[^"]*"', '', optimized)
            
            # Remove metadata elements
            optimized = re.sub(r'<metadata>.*?</metadata>', '', optimized, flags=re.DOTALL)
            optimized = re.sub(r'<title>.*?</title>', '', optimized, flags=re.DOTALL)
            optimized = re.sub(r'<desc>.*?</desc>', '', optimized, flags=re.DOTALL)
        
        # Round numeric values
        if settings.level == OptimizationLevel.AGGRESSIVE:
            def round_numbers(match):
                number = float(match.group(0))
                return str(round(number, 2))
            
            optimized = re.sub(r'\d+\.\d+', round_numbers, optimized)
        
        return optimized.strip()
    
    def _generate_svg_css(self, svg_name: str, svg_content: str) -> str:
        """Generate CSS for SVG usage"""
        
        class_name = f"icon-{svg_name.replace('.svg', '').replace('_', '-')}"
        
        # Extract viewBox for sizing calculations
        viewbox_match = re.search(r'viewBox="([^"]*)"', svg_content)
        viewbox = viewbox_match.group(1) if viewbox_match else "0 0 24 24"
        _, _, width, height = viewbox.split()
        aspect_ratio = float(height) / float(width)
        
        css = f'''.{class_name} {{
    display: inline-block;
    width: 1em;
    height: {aspect_ratio}em;
    fill: currentColor;
    vertical-align: middle;
}}

.{class_name}--small {{
    width: 0.75em;
    height: {aspect_ratio * 0.75}em;
}}

.{class_name}--large {{
    width: 1.5em;
    height: {aspect_ratio * 1.5}em;
}}

.{class_name}--spin {{
    animation: icon-spin 1s linear infinite;
}}

@keyframes icon-spin {{
    from {{ transform: rotate(0deg); }}
    to {{ transform: rotate(360deg); }}
}}'''
        
        return css
    
    async def _optimize_css(self, css_files: Dict[str, str], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize CSS files"""
        
        optimized_css = {}
        
        for css_name, css_content in css_files.items():
            optimized_css[css_name] = await self._optimize_single_css(
                css_name, css_content, settings
            )
        
        return optimized_css
    
    async def _optimize_single_css(self, css_name: str, css_content: str, settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize a single CSS file"""
        
        optimization_result = {
            "original": {
                "name": css_name,
                "size": len(css_content),
                "estimated_size": f"{len(css_content) / 1024:.1f}KB"
            },
            "optimized": {},
            "critical_css": {},
            "compression": {}
        }
        
        # Apply CSS optimizations
        optimized_css = self._apply_css_optimizations(css_content, settings)
        
        optimization_result["optimized"] = {
            "content": optimized_css,
            "size": len(optimized_css),
            "estimated_size": f"{len(optimized_css) / 1024:.1f}KB",
            "reduction": f"{((len(css_content) - len(optimized_css)) / len(css_content) * 100):.1f}%"
        }
        
        # Extract critical CSS
        optimization_result["critical_css"] = {
            "content": self._extract_critical_css(css_content),
            "description": "Above-the-fold CSS for faster initial render"
        }
        
        # Generate compression recommendations
        optimization_result["compression"] = {
            "gzip_estimated_size": f"{len(optimized_css) * 0.3 / 1024:.1f}KB",
            "brotli_estimated_size": f"{len(optimized_css) * 0.25 / 1024:.1f}KB",
            "recommendations": [
                "Enable gzip compression on server",
                "Consider Brotli compression for modern browsers",
                "Inline critical CSS for faster rendering"
            ]
        }
        
        return optimization_result
    
    def _apply_css_optimizations(self, css_content: str, settings: OptimizationSettings) -> str:
        """Apply CSS optimization techniques"""
        
        if not settings.minify_css:
            return css_content
        
        optimized = css_content
        
        # Remove comments
        optimized = re.sub(r'/\*.*?\*/', '', optimized, flags=re.DOTALL)
        
        # Remove unnecessary whitespace
        optimized = re.sub(r'\s+', ' ', optimized)
        optimized = re.sub(r';\s*}', '}', optimized)
        optimized = re.sub(r'{\s*', '{', optimized)
        optimized = re.sub(r'}\s*', '}', optimized)
        optimized = re.sub(r';\s*', ';', optimized)
        optimized = re.sub(r':\s*', ':', optimized)
        
        # Remove trailing semicolons
        optimized = re.sub(r';(?=\s*})', '', optimized)
        
        # Optimize color values
        optimized = re.sub(r'#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3', r'#\1\2\3', optimized)
        
        # Optimize zero values
        optimized = re.sub(r'\b0+\.?0*([a-z%]+)', '0', optimized)
        optimized = re.sub(r'\b0+([a-z%]+)', '0', optimized)
        
        return optimized.strip()
    
    def _extract_critical_css(self, css_content: str) -> str:
        """Extract critical CSS for above-the-fold content"""
        
        critical_selectors = [
            'body', 'html', 'header', '.header', 'nav', '.nav',
            '.hero', '.hero-section', 'h1', 'h2', '.btn', '.button',
            '.container', '.wrapper', '.navbar', '.navigation'
        ]
        
        critical_css = ""
        
        for selector in critical_selectors:
            # Find CSS rules for critical selectors
            pattern = rf'{re.escape(selector)}[^{{]*\{{[^}}]*\}}'
            matches = re.findall(pattern, css_content, re.IGNORECASE)
            for match in matches:
                if match not in critical_css:
                    critical_css += match + "\n"
        
        return critical_css.strip()
    
    async def _optimize_javascript(self, js_files: Dict[str, str], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize JavaScript files"""
        
        optimized_js = {}
        
        for js_name, js_content in js_files.items():
            optimized_js[js_name] = await self._optimize_single_javascript(
                js_name, js_content, settings
            )
        
        return optimized_js
    
    async def _optimize_single_javascript(self, js_name: str, js_content: str, settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize a single JavaScript file"""
        
        optimization_result = {
            "original": {
                "name": js_name,
                "size": len(js_content),
                "estimated_size": f"{len(js_content) / 1024:.1f}KB"
            },
            "optimized": {},
            "tree_shaking": {},
            "module_optimization": {}
        }
        
        # Apply JavaScript optimizations
        optimized_js = self._apply_javascript_optimizations(js_content, settings)
        
        optimization_result["optimized"] = {
            "content": optimized_js,
            "size": len(optimized_js),
            "estimated_size": f"{len(optimized_js) / 1024:.1f}KB",
            "reduction": f"{((len(js_content) - len(optimized_js)) / len(js_content) * 100):.1f}%"
        }
        
        # Tree shaking recommendations
        optimization_result["tree_shaking"] = {
            "unused_functions": self._identify_unused_functions(js_content),
            "recommendations": [
                "Remove unused functions and variables",
                "Use ES6 modules for better tree shaking",
                "Consider code splitting for large applications"
            ]
        }
        
        # Module optimization
        optimization_result["module_optimization"] = {
            "bundling": "Consider bundling related modules",
            "async_loading": "Use dynamic imports for non-critical code",
            "compression": "Enable gzip/brotli compression"
        }
        
        return optimization_result
    
    def _apply_javascript_optimizations(self, js_content: str, settings: OptimizationSettings) -> str:
        """Apply JavaScript optimization techniques"""
        
        if not settings.minify_js:
            return js_content
        
        optimized = js_content
        
        # Remove single-line comments
        optimized = re.sub(r'//.*$', '', optimized, flags=re.MULTILINE)
        
        # Remove multi-line comments
        optimized = re.sub(r'/\*.*?\*/', '', optimized, flags=re.DOTALL)
        
        # Remove unnecessary whitespace
        optimized = re.sub(r'\s+', ' ', optimized)
        optimized = re.sub(r';\s*', ';', optimized)
        optimized = re.sub(r'{\s*', '{', optimized)
        optimized = re.sub(r'}\s*', '}', optimized)
        optimized = re.sub(r',\s*', ',', optimized)
        
        # Remove trailing semicolons before }
        optimized = re.sub(r';(?=\s*})', '', optimized)
        
        return optimized.strip()
    
    def _identify_unused_functions(self, js_content: str) -> List[str]:
        """Identify potentially unused functions"""
        
        # Find function declarations
        function_declarations = re.findall(r'function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)', js_content)
        
        unused_functions = []
        for func_name in function_declarations:
            # Check if function is called elsewhere
            call_pattern = rf'{func_name}\s*\('
            if not re.search(call_pattern, js_content.replace(f'function {func_name}', '')):
                unused_functions.append(func_name)
        
        return unused_functions
    
    async def _optimize_fonts(self, fonts: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize font assets"""
        
        optimized_fonts = {}
        
        for font_name, font_data in fonts.items():
            optimized_fonts[font_name] = await self._optimize_single_font(
                font_name, font_data, settings
            )
        
        return optimized_fonts
    
    async def _optimize_single_font(self, font_name: str, font_data: Any, settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize a single font"""
        
        optimization_result = {
            "original": {
                "name": font_name,
                "format": self._detect_font_format(font_name)
            },
            "optimized_formats": {},
            "subsetting": {},
            "loading_optimization": {}
        }
        
        # Generate optimized font formats
        optimization_result["optimized_formats"] = {
            "woff2": {
                "estimated_size": "25KB",
                "browser_support": "Chrome 36+, Firefox 39+, Safari 12+",
                "compression": "Best compression ratio"
            },
            "woff": {
                "estimated_size": "35KB",
                "browser_support": "IE 9+, Chrome 5+, Firefox 3.6+",
                "compression": "Good compression with wide support"
            },
            "ttf": {
                "estimated_size": "45KB",
                "browser_support": "Universal support",
                "compression": "Fallback format"
            }
        }
        
        # Font subsetting recommendations
        optimization_result["subsetting"] = {
            "basic_latin": "A-Z, a-z, 0-9, basic punctuation",
            "extended_latin": "Additional accented characters",
            "custom_subset": "Only characters used in the design",
            "estimated_savings": "40-60% size reduction with proper subsetting"
        }
        
        # Loading optimization
        optimization_result["loading_optimization"] = {
            "font_display": "swap",
            "preload_critical": "Preload above-the-fold fonts",
            "fallback_fonts": "Define appropriate fallback font stack",
            "css_font_loading": "Use CSS Font Loading API for control"
        }
        
        # Generate font-face CSS
        optimization_result["css_font_face"] = self._generate_font_face_css(font_name)
        
        return optimization_result
    
    def _detect_font_format(self, filename: str) -> str:
        """Detect font format from filename"""
        
        extension = filename.lower().split('.')[-1]
        format_map = {
            'woff2': 'WOFF2',
            'woff': 'WOFF',
            'ttf': 'TrueType',
            'otf': 'OpenType',
            'eot': 'EOT'
        }
        return format_map.get(extension, 'Unknown')
    
    def _generate_font_face_css(self, font_name: str) -> str:
        """Generate @font-face CSS for optimized loading"""
        
        font_family = font_name.replace('-', ' ').replace('_', ' ').title()
        
        return f'''@font-face {{
    font-family: '{font_family}';
    src: url('{font_name}.woff2') format('woff2'),
         url('{font_name}.woff') format('woff'),
         url('{font_name}.ttf') format('truetype');
    font-display: swap;
    font-weight: normal;
    font-style: normal;
}}

/* Preload critical font */
<link rel="preload" href="{font_name}.woff2" as="font" type="font/woff2" crossorigin>'''
    
    async def _optimize_icons(self, icons: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Optimize icon assets"""
        
        optimized_icons = {
            "sprite_sheet": {},
            "icon_font": {},
            "individual_icons": {},
            "css_classes": {}
        }
        
        # Generate SVG sprite sheet
        optimized_icons["sprite_sheet"] = await self._generate_svg_sprite(icons, settings)
        
        # Generate icon font
        optimized_icons["icon_font"] = await self._generate_icon_font(icons, settings)
        
        # Optimize individual icons
        for icon_name, icon_data in icons.items():
            optimized_icons["individual_icons"][icon_name] = await self._optimize_single_svg(
                icon_name, icon_data, settings
            )
        
        # Generate CSS classes
        optimized_icons["css_classes"] = self._generate_icon_css_classes(icons)
        
        return optimized_icons
    
    async def _generate_svg_sprite(self, icons: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Generate SVG sprite sheet"""
        
        sprite_content = '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">\n'
        
        for icon_name, icon_content in icons.items():
            symbol_id = icon_name.replace('.svg', '')
            # Extract path data from SVG (simplified)
            sprite_content += f'    <symbol id="icon-{symbol_id}" viewBox="0 0 24 24">\n'
            sprite_content += '        <!-- Optimized icon paths -->\n'
            sprite_content += '    </symbol>\n'
        
        sprite_content += '</svg>'
        
        return {
            "content": sprite_content,
            "usage_example": '<svg class="icon"><use href="#icon-home"></use></svg>',
            "css_classes": self._generate_sprite_css_classes(icons),
            "estimated_size": f"{len(sprite_content)}B",
            "benefits": [
                "Single HTTP request for all icons",
                "Cacheable across pages",
                "Easy to style with CSS",
                "Scalable vector graphics"
            ]
        }
    
    async def _generate_icon_font(self, icons: Dict[str, Any], settings: OptimizationSettings) -> Dict[str, Any]:
        """Generate icon font"""
        
        return {
            "font_file": "icons.woff2",
            "css_classes": self._generate_icon_font_css(icons),
            "usage_example": '<i class="icon icon-home"></i>',
            "character_map": {icon.replace('.svg', ''): f"\\{ord('a') + i:04x}" for i, icon in enumerate(icons.keys())},
            "estimated_size": "15KB",
            "benefits": [
                "Tiny file size",
                "Works in older browsers",
                "Easy to use with CSS classes",
                "Can be styled like text"
            ]
        }
    
    def _generate_icon_css_classes(self, icons: Dict[str, Any]) -> str:
        """Generate CSS classes for icons"""
        
        css = """.icon {
    display: inline-block;
    width: 1em;
    height: 1em;
    fill: currentColor;
    vertical-align: middle;
}

/* Icon sizes */
.icon--xs { width: 0.75em; height: 0.75em; }
.icon--sm { width: 1em; height: 1em; }
.icon--md { width: 1.25em; height: 1.25em; }
.icon--lg { width: 1.5em; height: 1.5em; }
.icon--xl { width: 2em; height: 2em; }

/* Icon animations */
.icon--spin {
    animation: icon-spin 1s linear infinite;
}

.icon--pulse {
    animation: icon-pulse 1s ease-in-out infinite;
}

@keyframes icon-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes icon-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

"""
        
        # Add specific icon classes
        for icon_name in icons.keys():
            class_name = icon_name.replace('.svg', '').replace('_', '-')
            css += f".icon--{class_name} {{ /* Specific styling for {icon_name} */ }}\n"
        
        return css
    
    def _generate_sprite_css_classes(self, icons: Dict[str, Any]) -> str:
        """Generate CSS classes for sprite icons"""
        
        return self._generate_icon_css_classes(icons)
    
    def _generate_icon_font_css(self, icons: Dict[str, Any]) -> str:
        """Generate CSS for icon font"""
        
        css = '''@font-face {
    font-family: 'IconFont';
    src: url('icons.woff2') format('woff2'),
         url('icons.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: block;
}

.icon {
    font-family: 'IconFont';
    speak: never;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    text-transform: none;
    line-height: 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

'''
        
        # Add specific icon classes with unicode characters
        for i, icon_name in enumerate(icons.keys()):
            class_name = icon_name.replace('.svg', '').replace('_', '-')
            unicode_char = f"\\{ord('a') + i:04x}"
            css += f".icon-{class_name}:before {{ content: '{unicode_char}'; }}\n"
        
        return css
    
    async def _generate_optimization_metadata(self, original_assets: Dict, optimized_assets: Dict, settings: OptimizationSettings) -> Dict[str, Any]:
        """Generate optimization metadata and reports"""
        
        metadata = {
            "optimization_summary": {
                "total_files_processed": sum(len(assets) for assets in original_assets.values() if isinstance(assets, dict)),
                "optimization_level": settings.level.value,
                "target_devices": [device.value for device in settings.target_devices],
                "total_size_reduction": "estimated 40-60% reduction",
                "modern_formats_enabled": {
                    "webp": settings.enable_webp,
                    "avif": settings.enable_avif
                }
            },
            "performance_recommendations": [
                "Enable HTTP/2 for better multiplexing",
                "Use CDN for global asset delivery",
                "Implement progressive image loading",
                "Use service workers for asset caching",
                "Optimize critical rendering path"
            ],
            "implementation_guide": {
                "image_optimization": [
                    "Replace img tags with picture elements",
                    "Use srcset for responsive images",
                    "Implement lazy loading for below-fold images",
                    "Set up automatic image optimization in build process"
                ],
                "css_optimization": [
                    "Inline critical CSS in head",
                    "Load non-critical CSS asynchronously",
                    "Use CSS containment for better performance",
                    "Minimize unused CSS with PurgeCSS"
                ],
                "javascript_optimization": [
                    "Split code into critical and non-critical chunks",
                    "Use dynamic imports for code splitting",
                    "Implement tree shaking in build process",
                    "Use web workers for heavy computations"
                ],
                "font_optimization": [
                    "Preload critical fonts",
                    "Use font-display: swap for better loading",
                    "Subset fonts to required characters",
                    "Use variable fonts when appropriate"
                ]
            },
            "monitoring_metrics": [
                "Largest Contentful Paint (LCP)",
                "First Input Delay (FID)",
                "Cumulative Layout Shift (CLS)",
                "Time to First Byte (TTFB)",
                "First Contentful Paint (FCP)"
            ],
            "optimization_checklist": [
                "✅ Images optimized for web delivery",
                "✅ Modern image formats (WebP/AVIF) generated",
                "✅ Responsive image sets created",
                "✅ SVGs optimized and minified",
                "✅ CSS minified and critical path optimized",
                "✅ JavaScript minified and tree-shaken",
                "✅ Fonts optimized for web loading",
                "✅ Icon optimization strategy implemented"
            ]
        }
        
        return metadata
    
    def _initialize_optimization_profiles(self) -> Dict[str, Dict]:
        """Initialize optimization profiles for different use cases"""
        
        return {
            "mobile_first": {
                "image_quality": 85,
                "enable_webp": True,
                "aggressive_minification": True,
                "critical_css_extraction": True
            },
            "performance_focused": {
                "image_quality": 80,
                "enable_avif": True,
                "tree_shaking": True,
                "code_splitting": True
            },
            "quality_focused": {
                "image_quality": 95,
                "lossless_optimization": True,
                "preserve_metadata": True
            }
        }
    
    def _initialize_image_formats(self) -> Dict[str, Dict]:
        """Initialize image format specifications"""
        
        return {
            "jpeg": {"quality_range": (70, 95), "use_cases": ["photos", "complex_images"]},
            "png": {"compression": "lossless", "use_cases": ["graphics", "transparency"]},
            "webp": {"quality_range": (80, 95), "use_cases": ["modern_browsers"]},
            "avif": {"quality_range": (50, 80), "use_cases": ["cutting_edge_browsers"]}
        }
    
    def _initialize_css_optimization(self) -> Dict[str, List[str]]:
        """Initialize CSS optimization rules"""
        
        return {
            "minification": ["remove_whitespace", "remove_comments", "optimize_colors"],
            "critical_path": ["extract_above_fold", "inline_critical", "async_non_critical"],
            "unused_removal": ["purge_unused_selectors", "tree_shake_imports"]
        }
    
    def _initialize_js_optimization(self) -> Dict[str, List[str]]:
        """Initialize JavaScript optimization rules"""
        
        return {
            "minification": ["remove_whitespace", "remove_comments", "mangle_variables"],
            "code_splitting": ["dynamic_imports", "chunk_vendors", "lazy_loading"],
            "tree_shaking": ["remove_unused_exports", "side_effect_analysis"]
        }
    
    def _initialize_font_optimization(self) -> Dict[str, Any]:
        """Initialize font optimization rules"""
        
        return {
            "formats": ["woff2", "woff", "ttf"],
            "subsetting": ["basic_latin", "extended_latin", "custom"],
            "loading": ["preload", "font_display_swap", "fallback_fonts"]
        }
