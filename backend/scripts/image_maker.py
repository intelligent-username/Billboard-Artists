"""
Image Maker: Convert SVG to PNG using Selenium
"""
import sys
import tempfile
import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import xml.etree.ElementTree as ET
from PIL import Image
import io

def svg_to_png(svg_content, png_path, target_width=1800, target_height=2318):
    """Convert SVG content (string) to PNG file"""
    try:
        # Parse SVG to get dimensions
        root = ET.fromstring(svg_content)
        width = root.get('width', '100')
        height = root.get('height', '100')
        
        # Clean up dimensions
        width = int(float(width.replace('px', ''))) if 'px' in str(width) else int(float(width))
        height = int(float(height.replace('px', ''))) if 'px' in str(height) else int(float(height))
        
        # Scale for high DPI
        scale = 3.0
        scaled_width = int(width * scale)
        scaled_height = int(height * scale)
        
        # Chrome options
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--hide-scrollbars')
        options.add_argument('--disable-web-security')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--force-device-scale-factor=3')
        
        driver = webdriver.Chrome(options=options)
        driver.set_window_size(scaled_width + 40, scaled_height + 40)
        
        # Create HTML with embedded SVG
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ 
                    margin: 0; 
                    padding: 20px; 
                    background: white; 
                }}
                svg {{ 
                    width: {scaled_width}px; 
                    height: {scaled_height}px; 
                    display: block;
                }}
            </style>
        </head>
        <body>
            {svg_content}
        </body>
        </html>
        """
        
        # Create temporary HTML file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(html_content)
            temp_html = f.name
        
        try:
            driver.get(f"file:///{os.path.abspath(temp_html)}")
            driver.implicitly_wait(3)
            
            # Take screenshot
            png_data = driver.get_screenshot_as_png()
            img = Image.open(io.BytesIO(png_data))
            
            # Crop to remove padding
            img = img.crop((20, 20, scaled_width + 20, scaled_height + 20))
            img.save(str(png_path), dpi=(300, 300))
            
            print(f"PNG saved to {png_path}")
            
        finally:
            driver.quit()
            os.unlink(temp_html)
            
    except Exception as e:
        print(f"ERROR: Failed to convert SVG to PNG: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python image_maker.py input.svg output.png", file=sys.stderr)
        sys.exit(1)
    
    svg_path = Path(sys.argv[1])
    png_path = Path(sys.argv[2])
    
    if not svg_path.exists():
        print(f"SVG file not found: {svg_path}", file=sys.stderr)
        sys.exit(1)
    
    # Read SVG content
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()
    
    svg_to_png(svg_content, png_path)
