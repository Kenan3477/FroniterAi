"""
Brand Identity Generator

Creates comprehensive brand identity packages including:
- Logo designs and variations
- Color palette generation
- Typography systems
- Brand guidelines and usage rules
"""

import asyncio
import colorsys
import math
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class LogoStyle(Enum):
    """Logo design styles"""
    WORDMARK = "wordmark"
    ICON_TEXT = "icon_text"
    ICON_ONLY = "icon_only"
    EMBLEM = "emblem"
    ABSTRACT = "abstract"
    GEOMETRIC = "geometric"

class ColorHarmony(Enum):
    """Color harmony types"""
    MONOCHROMATIC = "monochromatic"
    ANALOGOUS = "analogous"
    COMPLEMENTARY = "complementary"
    TRIADIC = "triadic"
    TETRADIC = "tetradic"
    SPLIT_COMPLEMENTARY = "split_complementary"

@dataclass
class ColorPalette:
    """Color palette structure"""
    primary: str
    secondary: str
    accent: str
    neutral: List[str]
    semantic: Dict[str, str]
    gradients: List[str]

class BrandIdentityGenerator:
    """
    Comprehensive brand identity generator that creates:
    - Logo concepts and variations
    - Color palette with accessibility compliance
    - Typography hierarchy and font pairings
    - Brand voice and personality guidelines
    - Usage guidelines and brand standards
    """
    
    def __init__(self):
        self.logo_styles = self._initialize_logo_styles()
        self.typography_pairings = self._initialize_typography_pairings()
        self.color_psychology = self._initialize_color_psychology()
        
    async def generate_brand_identity(self, requirements) -> Dict[str, Any]:
        """Generate complete brand identity package"""
        
        # Generate color palette
        color_palette = await self._generate_color_palette(requirements)
        
        # Generate typography system
        typography = await self._generate_typography_system(requirements)
        
        # Generate logo concepts
        logo_concepts = await self._generate_logo_concepts(requirements, color_palette)
        
        # Generate brand guidelines
        brand_guidelines = await self._generate_brand_guidelines(
            requirements, color_palette, typography
        )
        
        # Generate usage examples
        usage_examples = await self._generate_usage_examples(
            requirements, color_palette, typography, logo_concepts
        )
        
        return {
            "color_palette": color_palette.__dict__,
            "typography": typography,
            "logo_concepts": logo_concepts,
            "brand_guidelines": brand_guidelines,
            "usage_examples": usage_examples,
            "brand_assets": await self._generate_brand_assets(
                requirements, color_palette, typography, logo_concepts
            )
        }
    
    async def _generate_color_palette(self, requirements) -> ColorPalette:
        """Generate accessible color palette based on requirements"""
        
        # Base color from style and industry
        base_hue = self._get_base_hue_for_style(requirements.design_style, requirements.industry)
        
        # Generate primary color
        primary_color = self._hsl_to_hex(base_hue, 0.7, 0.5)
        
        # Generate secondary color using harmony rules
        harmony = ColorHarmony.COMPLEMENTARY if requirements.design_style.value in ["bold", "creative"] else ColorHarmony.ANALOGOUS
        secondary_hue = self._get_harmony_hue(base_hue, harmony)
        secondary_color = self._hsl_to_hex(secondary_hue, 0.6, 0.6)
        
        # Generate accent color
        accent_hue = (base_hue + 120) % 360  # Triadic harmony
        accent_color = self._hsl_to_hex(accent_hue, 0.8, 0.55)
        
        # Generate neutral palette
        neutral_colors = self._generate_neutral_palette(requirements.design_style)
        
        # Generate semantic colors
        semantic_colors = {
            "success": "#10b981",  # Green
            "warning": "#f59e0b",  # Amber
            "error": "#ef4444",    # Red
            "info": "#3b82f6",     # Blue
        }
        
        # Generate gradients
        gradients = [
            f"linear-gradient(135deg, {primary_color} 0%, {secondary_color} 100%)",
            f"linear-gradient(45deg, {primary_color} 0%, {accent_color} 100%)",
            f"linear-gradient(180deg, {primary_color} 0%, {self._darken_color(primary_color, 0.2)} 100%)"
        ]
        
        return ColorPalette(
            primary=primary_color,
            secondary=secondary_color,
            accent=accent_color,
            neutral=neutral_colors,
            semantic=semantic_colors,
            gradients=gradients
        )
    
    def _get_base_hue_for_style(self, style, industry) -> float:
        """Get base hue based on design style and industry"""
        
        style_hues = {
            "minimalist": 210,    # Cool blue
            "modern": 220,        # Blue
            "corporate": 230,     # Navy blue
            "creative": 280,      # Purple
            "tech": 200,          # Cyan blue
            "luxury": 270,        # Deep purple
            "playful": 45,        # Orange
            "elegant": 300,       # Magenta
            "bold": 15,           # Red-orange
            "clean": 180          # Teal
        }
        
        industry_hues = {
            "technology": 210,
            "healthcare": 160,    # Green
            "finance": 230,       # Blue
            "education": 200,     # Light blue
            "retail": 330,        # Pink
            "hospitality": 30,    # Orange
            "real_estate": 200,   # Blue
            "consulting": 220,    # Blue
            "creative": 280,      # Purple
            "nonprofit": 140      # Green
        }
        
        # Blend style and industry preferences
        style_hue = style_hues.get(style.value, 220)
        industry_hue = industry_hues.get(industry.value, 220)
        
        # Weight style more heavily
        return (style_hue * 0.7 + industry_hue * 0.3) % 360
    
    def _get_harmony_hue(self, base_hue: float, harmony: ColorHarmony) -> float:
        """Get harmonious hue based on color harmony type"""
        
        harmony_offsets = {
            ColorHarmony.COMPLEMENTARY: 180,
            ColorHarmony.ANALOGOUS: 30,
            ColorHarmony.TRIADIC: 120,
            ColorHarmony.SPLIT_COMPLEMENTARY: 150,
            ColorHarmony.TETRADIC: 90
        }
        
        offset = harmony_offsets.get(harmony, 30)
        return (base_hue + offset) % 360
    
    def _generate_neutral_palette(self, style) -> List[str]:
        """Generate neutral color palette"""
        
        # Warmer neutrals for certain styles
        warm_styles = ["luxury", "elegant", "creative"]
        base_hue = 30 if style.value in warm_styles else 220
        
        neutrals = []
        for i in range(9):
            lightness = 0.95 - (i * 0.1)  # From very light to very dark
            saturation = 0.05 if style.value in warm_styles else 0.02
            color = self._hsl_to_hex(base_hue, saturation, lightness)
            neutrals.append(color)
        
        return neutrals
    
    def _hsl_to_hex(self, h: float, s: float, l: float) -> str:
        """Convert HSL to hex color"""
        h = h / 360.0
        r, g, b = colorsys.hls_to_rgb(h, l, s)
        r, g, b = int(r * 255), int(g * 255), int(b * 255)
        return f"#{r:02x}{g:02x}{b:02x}"
    
    def _darken_color(self, hex_color: str, factor: float) -> str:
        """Darken a hex color by a factor"""
        hex_color = hex_color.lstrip('#')
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        r, g, b = int(r * (1 - factor)), int(g * (1 - factor)), int(b * (1 - factor))
        return f"#{r:02x}{g:02x}{b:02x}"
    
    async def _generate_typography_system(self, requirements) -> Dict[str, Any]:
        """Generate typography system with font pairings"""
        
        # Select primary font based on style
        primary_fonts = {
            "minimalist": "Inter",
            "modern": "Poppins",
            "corporate": "Source Sans Pro",
            "creative": "Montserrat",
            "tech": "JetBrains Mono",
            "luxury": "Playfair Display",
            "playful": "Nunito",
            "elegant": "Crimson Text",
            "bold": "Oswald",
            "clean": "Lato"
        }
        
        primary_font = primary_fonts.get(requirements.design_style.value, "Inter")
        
        # Select secondary font for headings or accents
        secondary_fonts = {
            "minimalist": "Inter",
            "modern": "Montserrat",
            "corporate": "Merriweather",
            "creative": "Dancing Script",
            "tech": "Fira Code",
            "luxury": "Cormorant Garamond",
            "playful": "Comfortaa",
            "elegant": "Libre Baskerville",
            "bold": "Roboto Condensed",
            "clean": "Open Sans"
        }
        
        secondary_font = secondary_fonts.get(requirements.design_style.value, "Montserrat")
        
        return {
            "primary_font": primary_font,
            "secondary_font": secondary_font,
            "font_stack": f"'{primary_font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            "font_weights": {
                "light": 300,
                "regular": 400,
                "medium": 500,
                "semibold": 600,
                "bold": 700,
                "black": 900
            },
            "font_sizes": {
                "xs": "0.75rem",    # 12px
                "sm": "0.875rem",   # 14px
                "base": "1rem",     # 16px
                "lg": "1.125rem",   # 18px
                "xl": "1.25rem",    # 20px
                "2xl": "1.5rem",    # 24px
                "3xl": "1.875rem",  # 30px
                "4xl": "2.25rem",   # 36px
                "5xl": "3rem",      # 48px
                "6xl": "3.75rem",   # 60px
                "7xl": "4.5rem",    # 72px
                "8xl": "6rem",      # 96px
                "9xl": "8rem"       # 128px
            },
            "line_heights": {
                "none": 1,
                "tight": 1.25,
                "snug": 1.375,
                "normal": 1.5,
                "relaxed": 1.625,
                "loose": 2
            },
            "letter_spacing": {
                "tighter": "-0.05em",
                "tight": "-0.025em",
                "normal": "0em",
                "wide": "0.025em",
                "wider": "0.05em",
                "widest": "0.1em"
            }
        }
    
    async def _generate_logo_concepts(self, requirements, color_palette: ColorPalette) -> Dict[str, Any]:
        """Generate logo concepts and variations"""
        
        project_name = requirements.project_name
        initials = ''.join([word[0].upper() for word in project_name.split()[:2]])
        
        logo_concepts = {
            "primary_logo": {
                "type": "wordmark",
                "description": f"Primary wordmark logo for {project_name}",
                "svg_code": self._generate_wordmark_svg(project_name, color_palette.primary),
                "usage": "Main brand applications, website headers, business cards"
            },
            "secondary_logo": {
                "type": "icon_text",
                "description": f"Icon with text for {project_name}",
                "svg_code": self._generate_icon_text_svg(project_name, initials, color_palette.primary),
                "usage": "App icons, social media, merchandise"
            },
            "icon_only": {
                "type": "icon",
                "description": f"Icon-only version for {project_name}",
                "svg_code": self._generate_icon_svg(initials, color_palette.primary),
                "usage": "Favicons, app icons, watermarks"
            },
            "monochrome": {
                "type": "monochrome",
                "description": "Single color version for special applications",
                "svg_code": self._generate_wordmark_svg(project_name, "#000000"),
                "usage": "Print materials, embossing, single-color applications"
            }
        }
        
        return {
            "concepts": logo_concepts,
            "variations": {
                "horizontal": "Standard horizontal layout",
                "vertical": "Stacked vertical layout",
                "icon_left": "Icon positioned to the left of text",
                "icon_top": "Icon positioned above text"
            },
            "sizes": {
                "large": "Primary size for headers and main applications",
                "medium": "Standard size for general use",
                "small": "Minimum size for favicons and small applications"
            },
            "formats": ["SVG", "PNG", "JPG", "PDF", "EPS"]
        }
    
    def _generate_wordmark_svg(self, text: str, color: str) -> str:
        """Generate SVG wordmark logo"""
        return f'''<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .logo-text {{
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 32px;
        fill: {color};
        letter-spacing: -0.02em;
      }}
    </style>
  </defs>
  <text x="20" y="50" class="logo-text">{text}</text>
</svg>'''
    
    def _generate_icon_text_svg(self, text: str, initials: str, color: str) -> str:
        """Generate SVG icon with text logo"""
        return f'''<svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .logo-icon {{
        fill: {color};
      }}
      .logo-text {{
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 28px;
        fill: {color};
        letter-spacing: -0.01em;
      }}
    </style>
  </defs>
  <!-- Icon circle -->
  <circle cx="50" cy="50" r="35" class="logo-icon" opacity="0.1"/>
  <circle cx="50" cy="50" r="25" class="logo-icon"/>
  <text x="50" y="58" text-anchor="middle" class="logo-text" font-size="20" fill="white">{initials}</text>
  <!-- Brand text -->
  <text x="110" y="58" class="logo-text">{text}</text>
</svg>'''
    
    def _generate_icon_svg(self, initials: str, color: str) -> str:
        """Generate SVG icon-only logo"""
        return f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .icon-bg {{
        fill: {color};
      }}
      .icon-text {{
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 32px;
        fill: white;
        text-anchor: middle;
        dominant-baseline: central;
      }}
    </style>
  </defs>
  <rect width="100" height="100" rx="20" class="icon-bg"/>
  <text x="50" y="50" class="icon-text">{initials}</text>
</svg>'''
    
    async def _generate_brand_guidelines(self, requirements, color_palette: ColorPalette, typography: Dict) -> Dict[str, Any]:
        """Generate comprehensive brand guidelines"""
        
        return {
            "brand_overview": {
                "mission": f"Delivering exceptional {requirements.industry.value} solutions",
                "vision": f"Leading innovation in {requirements.industry.value}",
                "values": requirements.brand_values,
                "personality": self._generate_brand_personality(requirements.design_style),
                "voice": self._generate_brand_voice(requirements.design_style, requirements.industry)
            },
            "logo_guidelines": {
                "minimum_size": "24px height for digital, 0.5 inch for print",
                "clear_space": "Minimum clear space equal to the height of the logo",
                "backgrounds": "Use on light backgrounds, white or neutral colors",
                "restrictions": [
                    "Do not stretch or distort the logo",
                    "Do not change colors unless specified",
                    "Do not add effects or shadows",
                    "Do not use on busy backgrounds"
                ]
            },
            "color_guidelines": {
                "primary_usage": f"Primary color {color_palette.primary} for main brand elements",
                "secondary_usage": f"Secondary color {color_palette.secondary} for supporting elements",
                "accessibility": "All color combinations meet WCAG AA standards",
                "applications": {
                    "digital": "Use RGB values for screen applications",
                    "print": "Use CMYK values for print applications",
                    "web": "Use hex values for web development"
                }
            },
            "typography_guidelines": {
                "primary_font": f"{typography['primary_font']} for body text and general content",
                "secondary_font": f"{typography['secondary_font']} for headings and emphasis",
                "hierarchy": "Maintain consistent type hierarchy across all applications",
                "readability": "Ensure minimum 16px font size for body text"
            },
            "imagery_guidelines": {
                "style": self._get_imagery_style(requirements.design_style),
                "color_treatment": "Images should complement the brand color palette",
                "composition": "Clean, professional compositions with adequate white space",
                "quality": "High-resolution images optimized for their intended use"
            }
        }
    
    def _generate_brand_personality(self, style) -> List[str]:
        """Generate brand personality traits"""
        
        personality_traits = {
            "minimalist": ["Clean", "Focused", "Efficient", "Calm", "Purposeful"],
            "modern": ["Innovative", "Dynamic", "Progressive", "Sleek", "Confident"],
            "corporate": ["Professional", "Trustworthy", "Reliable", "Authoritative", "Stable"],
            "creative": ["Imaginative", "Inspiring", "Original", "Expressive", "Bold"],
            "tech": ["Cutting-edge", "Precise", "Intelligent", "Efficient", "Future-focused"],
            "luxury": ["Premium", "Exclusive", "Sophisticated", "Refined", "Prestigious"],
            "playful": ["Fun", "Energetic", "Approachable", "Cheerful", "Optimistic"],
            "elegant": ["Graceful", "Timeless", "Sophisticated", "Refined", "Classic"],
            "bold": ["Confident", "Impactful", "Strong", "Decisive", "Powerful"],
            "clean": ["Simple", "Clear", "Honest", "Transparent", "Approachable"]
        }
        
        return personality_traits.get(style.value, ["Professional", "Reliable", "Innovative"])
    
    def _generate_brand_voice(self, style, industry) -> Dict[str, str]:
        """Generate brand voice characteristics"""
        
        voice_characteristics = {
            "tone": self._get_tone_for_style(style),
            "language": self._get_language_for_industry(industry),
            "messaging": self._get_messaging_approach(style, industry)
        }
        
        return voice_characteristics
    
    def _get_tone_for_style(self, style) -> str:
        """Get appropriate tone for design style"""
        
        tones = {
            "minimalist": "Calm and focused, speaking directly to the point",
            "modern": "Confident and forward-thinking, embracing innovation",
            "corporate": "Professional and authoritative, building trust",
            "creative": "Inspiring and imaginative, encouraging exploration",
            "tech": "Precise and intelligent, demonstrating expertise",
            "luxury": "Sophisticated and exclusive, emphasizing quality",
            "playful": "Friendly and energetic, creating positive emotions",
            "elegant": "Refined and graceful, speaking with poise",
            "bold": "Strong and decisive, making impactful statements",
            "clean": "Simple and honest, communicating clearly"
        }
        
        return tones.get(style.value, "Professional and approachable")
    
    def _get_language_for_industry(self, industry) -> str:
        """Get appropriate language for industry"""
        
        languages = {
            "technology": "Technical yet accessible, explaining complex concepts simply",
            "healthcare": "Caring and trustworthy, prioritizing patient well-being",
            "finance": "Secure and reliable, emphasizing trust and stability",
            "education": "Encouraging and supportive, fostering growth and learning",
            "retail": "Helpful and convenient, focusing on customer experience",
            "hospitality": "Warm and welcoming, creating memorable experiences",
            "real_estate": "Knowledgeable and trustworthy, guiding important decisions",
            "consulting": "Expert and results-oriented, demonstrating value",
            "creative": "Inspiring and original, celebrating creativity",
            "nonprofit": "Compassionate and impactful, driving positive change"
        }
        
        return languages.get(industry.value, "Professional and informative")
    
    def _get_messaging_approach(self, style, industry) -> str:
        """Get messaging approach combining style and industry"""
        
        return f"Communicate with a {style.value} approach that resonates with {industry.value} audiences, balancing professionalism with accessibility."
    
    def _get_imagery_style(self, style) -> str:
        """Get imagery style for brand guidelines"""
        
        imagery_styles = {
            "minimalist": "Clean, simple compositions with lots of white space",
            "modern": "Contemporary, high-quality images with bold compositions",
            "corporate": "Professional photography with clean, business-appropriate subjects",
            "creative": "Artistic, expressive imagery that showcases creativity",
            "tech": "Clean, modern imagery focusing on innovation and precision",
            "luxury": "High-end, sophisticated imagery with premium quality",
            "playful": "Colorful, energetic imagery that evokes positive emotions",
            "elegant": "Refined, timeless imagery with classic compositions",
            "bold": "High-contrast, impactful imagery that makes a statement",
            "clean": "Simple, honest imagery that clearly communicates the message"
        }
        
        return imagery_styles.get(style.value, "Professional, high-quality imagery")
    
    async def _generate_usage_examples(self, requirements, color_palette: ColorPalette, typography: Dict, logo_concepts: Dict) -> Dict[str, Any]:
        """Generate brand usage examples"""
        
        return {
            "business_card": {
                "layout": "Logo on front with contact information, brand colors",
                "typography": f"Name in {typography['primary_font']} bold, details in regular weight",
                "colors": f"Primary color {color_palette.primary} for logo and accent elements"
            },
            "letterhead": {
                "header": "Logo and company information in header",
                "typography": f"Body text in {typography['primary_font']} regular",
                "colors": f"Brand colors for logo, neutral gray for text"
            },
            "website_header": {
                "layout": "Horizontal logo with navigation menu",
                "typography": f"Navigation in {typography['primary_font']} medium weight",
                "colors": f"Primary brand colors with neutral background"
            },
            "social_media": {
                "profile_image": "Icon-only logo version",
                "cover_image": "Brand name with tagline on brand-colored background",
                "post_templates": "Consistent use of brand colors and typography"
            },
            "presentation": {
                "title_slide": "Logo with presentation title",
                "content_slides": "Brand colors for headers and accents",
                "typography": f"Headings in {typography['secondary_font']}, body in {typography['primary_font']}"
            }
        }
    
    async def _generate_brand_assets(self, requirements, color_palette: ColorPalette, typography: Dict, logo_concepts: Dict) -> Dict[str, Any]:
        """Generate downloadable brand assets"""
        
        return {
            "logo_files": {
                "svg": "Vector format for scalability",
                "png_high_res": "High resolution for print (300 DPI)",
                "png_web": "Web optimized (72 DPI)",
                "pdf": "Print-ready vector format",
                "favicon": "16x16, 32x32, 48x48 pixel versions"
            },
            "color_swatches": {
                "adobe_swatches": "ASE file for Adobe Creative Suite",
                "sketch_palette": "Sketch color palette file",
                "css_variables": "CSS custom properties file",
                "pantone_colors": "Pantone color equivalents for print"
            },
            "font_files": {
                "web_fonts": "WOFF2 format for web use",
                "desktop_fonts": "TTF/OTF for desktop applications",
                "font_licensing": "Usage rights and licensing information"
            },
            "templates": {
                "business_card": "Print-ready business card template",
                "letterhead": "Letter and document templates",
                "presentation": "PowerPoint/Keynote template",
                "social_media": "Templates for major social platforms"
            },
            "guidelines_document": {
                "pdf_guide": "Comprehensive brand guidelines PDF",
                "quick_reference": "One-page brand summary",
                "web_styleguide": "Interactive online style guide"
            }
        }
    
    def _initialize_logo_styles(self) -> Dict[str, Any]:
        """Initialize logo style templates"""
        return {
            "wordmark": "Text-only logo design",
            "icon_text": "Icon combined with text",
            "icon_only": "Standalone icon design",
            "emblem": "Badge or seal style design",
            "abstract": "Abstract symbol design",
            "geometric": "Geometric shape-based design"
        }
    
    def _initialize_typography_pairings(self) -> Dict[str, List[str]]:
        """Initialize font pairing recommendations"""
        return {
            "classic": ["Merriweather", "Open Sans"],
            "modern": ["Montserrat", "Source Sans Pro"],
            "elegant": ["Playfair Display", "Source Sans Pro"],
            "tech": ["JetBrains Mono", "Inter"],
            "creative": ["Dancing Script", "Lato"],
            "corporate": ["Georgia", "Helvetica"],
            "minimal": ["Inter", "Inter"],
            "bold": ["Oswald", "Lato"]
        }
    
    def _initialize_color_psychology(self) -> Dict[str, Dict[str, str]]:
        """Initialize color psychology mapping"""
        return {
            "red": {"emotion": "Energy, passion, urgency", "use": "Call-to-action, alerts"},
            "blue": {"emotion": "Trust, stability, calm", "use": "Corporate, healthcare, finance"},
            "green": {"emotion": "Growth, nature, harmony", "use": "Environment, health, finance"},
            "purple": {"emotion": "Luxury, creativity, mystery", "use": "Luxury brands, creative services"},
            "orange": {"emotion": "Enthusiasm, creativity, warmth", "use": "Food, entertainment, sports"},
            "yellow": {"emotion": "Optimism, clarity, warmth", "use": "Energy, food, children"},
            "black": {"emotion": "Sophistication, elegance, power", "use": "Luxury, fashion, technology"},
            "white": {"emotion": "Purity, simplicity, cleanliness", "use": "Healthcare, minimal design"}
        }
