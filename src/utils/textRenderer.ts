/**
 * Text Pre-Rendering Utility
 * Eliminates blurry text at high speeds by pre-rendering words as canvas images
 * Suitable for games with fast-moving text elements like Word Volley and Whack-a-Mole
 */

export interface TextRenderOptions {
  fontSize: number;
  color: string;
  fontFamily: string;
  maxWidth?: number;
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: string;
  padding?: number;
}

export interface CachedTextImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  actualFontSize: number;
}

export class TextRenderer {
  private cache: Map<string, CachedTextImage> = new Map();
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 200) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Create a cache key for text rendering parameters
   */
  private createCacheKey(text: string, options: TextRenderOptions): string {
    const { fontSize, color, fontFamily, maxWidth, bold, italic, backgroundColor, padding } = options;
    return `${text}-${fontSize}-${color}-${fontFamily}-${maxWidth || 'auto'}-${bold || false}-${italic || false}-${backgroundColor || 'transparent'}-${padding || 4}`;
  }

  /**
   * Pre-render text as a canvas image for crisp, non-blurry rendering
   */
  preRenderText(text: string, options: TextRenderOptions): CachedTextImage {
    const cacheKey = this.createCacheKey(text, options);

    // Check if already cached
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create off-screen canvas for rendering
    const wordCanvas = document.createElement('canvas');
    const wordCtx = wordCanvas.getContext('2d')!;

    // Set up font style
    const fontWeight = options.bold ? 'bold' : 'normal';
    const fontStyle = options.italic ? 'italic' : 'normal';
    let currentFontSize = options.fontSize;
    
    wordCtx.font = `${fontStyle} ${fontWeight} ${currentFontSize}px ${options.fontFamily}`;
    let textMetrics = wordCtx.measureText(text);

    // Shrink font if maxWidth is specified and text is too wide
    if (options.maxWidth) {
      while (textMetrics.width > options.maxWidth && currentFontSize > 8) {
        currentFontSize -= 1;
        wordCtx.font = `${fontStyle} ${fontWeight} ${currentFontSize}px ${options.fontFamily}`;
        textMetrics = wordCtx.measureText(text);
      }
    }

    // Calculate canvas size with padding
    const padding = options.padding || 4;
    const canvasWidth = Math.ceil(textMetrics.width) + (padding * 2);
    const canvasHeight = Math.ceil(currentFontSize * 1.4) + (padding * 2);

    // Set canvas size
    wordCanvas.width = canvasWidth;
    wordCanvas.height = canvasHeight;

    // Re-apply font settings after canvas resize (canvas resize clears context)
    wordCtx.font = `${fontStyle} ${fontWeight} ${currentFontSize}px ${options.fontFamily}`;
    wordCtx.textAlign = 'center';
    wordCtx.textBaseline = 'middle';

    // Enable crisp text rendering
    wordCtx.imageSmoothingEnabled = false;

    // Draw background if specified
    if (options.backgroundColor) {
      wordCtx.fillStyle = options.backgroundColor;
      wordCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Render text at center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    wordCtx.fillStyle = options.color;
    wordCtx.fillText(text, centerX, centerY);

    // Create cached image object
    const cachedImage: CachedTextImage = {
      canvas: wordCanvas,
      width: canvasWidth,
      height: canvasHeight,
      actualFontSize: currentFontSize
    };

    // Cache the rendered text
    this.cache.set(cacheKey, cachedImage);

    // Limit cache size to prevent memory issues
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    return cachedImage;
  }

  /**
   * Draw pre-rendered text to a canvas context at specified coordinates
   */
  drawPreRenderedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: TextRenderOptions,
    centered: boolean = true
  ): void {
    const cachedImage = this.preRenderText(text, options);
    
    // Calculate position (centered or top-left)
    const drawX = centered ? Math.round(x - cachedImage.width / 2) : Math.round(x);
    const drawY = centered ? Math.round(y - cachedImage.height / 2) : Math.round(y);

    // Temporarily disable image smoothing for crisp rendering
    const originalSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    
    // Draw the pre-rendered text image
    ctx.drawImage(cachedImage.canvas, drawX, drawY);
    
    // Restore original smoothing setting
    ctx.imageSmoothingEnabled = originalSmoothing;
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a specific pattern
   */
  clearCachePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// Create a default shared text renderer instance
export const defaultTextRenderer = new TextRenderer(200);

/**
 * Convenience function for quick text pre-rendering
 */
export function preRenderTextQuick(
  text: string,
  fontSize: number,
  color: string,
  fontFamily: string = 'Arial',
  options?: Partial<TextRenderOptions>
): CachedTextImage {
  const renderOptions: TextRenderOptions = {
    fontSize,
    color,
    fontFamily,
    bold: true,
    ...options
  };
  
  return defaultTextRenderer.preRenderText(text, renderOptions);
}

/**
 * Convenience function for drawing pre-rendered text
 */
export function drawCrispText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  fontFamily: string = 'Arial',
  options?: Partial<TextRenderOptions>
): void {
  const renderOptions: TextRenderOptions = {
    fontSize,
    color,
    fontFamily,
    bold: true,
    ...options
  };
  
  defaultTextRenderer.drawPreRenderedText(ctx, text, x, y, renderOptions, true);
} 