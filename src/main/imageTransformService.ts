/**
 * Image Transformation Service
 *
 * Handles image processing for claim submissions:
 * - Extracts image metadata (dimensions, format, etc.)
 * - Determines if transformation is needed (width > 2000px)
 * - Transforms images to max 2000px width with WebP optimization
 * - Maintains aspect ratio and transparency
 * - Provides graceful fallbacks on errors
 */

/**
 * Lazily loaded sharp module
 * Using lazy initialization to handle potential import issues
 */
let sharp: typeof import("sharp") | null = null;

/**
 * Image metadata extracted from buffer
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  size: number; // original buffer size in bytes
}

/**
 * Result of image transformation operation
 */
export interface TransformationResult {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
  transformedSize: number;
  metadata: {
    originalDimensions: { width: number; height: number };
    newDimensions: { width: number; height: number };
    format: string;
  };
}

/**
 * Options for image transformation
 */
export interface TransformationOptions {
  maxWidth?: number; // Default: 2000
  quality?: number; // Default: 85 (WebP/JPEG quality)
  alphaQuality?: number; // Default: 90 (WebP alpha quality)
  effort?: number; // Default: 4 (WebP encoding effort 1-6)
  forceFormat?: "webp" | "original"; // Default: 'webp'
}

/**
 * Default transformation options
 */
const DEFAULT_OPTIONS: Required<TransformationOptions> = {
  maxWidth: 2000,
  quality: 85,
  alphaQuality: 90,
  effort: 4,
  forceFormat: "webp",
};

/**
 * Extract metadata from an image buffer
 *
 * @param buffer - Image buffer to analyze
 * @returns Image metadata or null if extraction fails
 */
export async function getImageMetadata(
  buffer: Buffer,
): Promise<ImageMetadata | null> {
  try {
    if (!sharp) {
      try {
        sharp = require("sharp");
      } catch (error) {
        console.error(
          "[ImageTransformService] Failed to load sharp module:",
          error,
        );
        return null;
      }
    }

    if (!sharp) {
      return null;
    }

    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      hasAlpha: metadata.hasAlpha || false,
      size: buffer.length,
    };
  } catch (error) {
    console.error("[ImageTransformService] Failed to extract metadata:", error);
    return null;
  }
}

/**
 * Determine if an image should be transformed
 *
 * @param metadata - Image metadata
 * @param mimeType - MIME type of the image
 * @param options - Transformation options
 * @returns true if transformation is needed, false otherwise
 */
export function shouldTransformImage(
  metadata: ImageMetadata,
  mimeType: string,
  options?: TransformationOptions,
): boolean {
  // Skip SVG (vector format, resolution-independent)
  if (mimeType === "image/svg+xml") {
    return false;
  }

  // Skip animated GIFs (Sharp doesn't handle multi-frame well)
  if (mimeType === "image/gif") {
    return false;
  }

  const maxWidth = options?.maxWidth || DEFAULT_OPTIONS.maxWidth;

  // Transform if width exceeds threshold
  return metadata.width > maxWidth;
}

/**
 * Transform an image to the specified dimensions and format
 *
 * @param buffer - Original image buffer
 * @param metadata - Image metadata
 * @param options - Transformation options
 * @returns Transformation result with new buffer and metadata
 */
export async function transformImage(
  buffer: Buffer,
  metadata: ImageMetadata,
  options?: TransformationOptions,
): Promise<TransformationResult> {
  if (!sharp) {
    sharp = require("sharp");
  }

  if (!sharp) {
    throw new Error("Sharp module not available");
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Calculate target dimensions maintaining aspect ratio
  const aspectRatio = metadata.height / metadata.width;
  const targetWidth = Math.min(metadata.width, opts.maxWidth);
  const targetHeight = Math.round(targetWidth * aspectRatio);

  let pipeline = sharp(buffer).resize(targetWidth, targetHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  let outputMimeType = "image/webp";
  let outputFormat = "webp";

  // Apply format conversion
  if (opts.forceFormat === "webp") {
    pipeline = pipeline.webp({
      quality: opts.quality,
      alphaQuality: opts.alphaQuality,
      effort: opts.effort,
    });
    outputFormat = "webp";
  } else {
    // Keep original format with optimization
    outputFormat = metadata.format;
    outputMimeType = `image/${metadata.format}`;

    switch (metadata.format) {
      case "jpeg":
      case "jpg":
        pipeline = pipeline.jpeg({ quality: opts.quality });
        break;
      case "png":
        pipeline = pipeline.png({
          quality: opts.quality,
          compressionLevel: 9,
        });
        break;
      case "webp":
        pipeline = pipeline.webp({
          quality: opts.quality,
          alphaQuality: opts.alphaQuality,
          effort: opts.effort,
        });
        break;
      default:
        // For other formats, try to convert to WebP
        pipeline = pipeline.webp({
          quality: opts.quality,
          alphaQuality: opts.alphaQuality,
          effort: opts.effort,
        });
        outputMimeType = "image/webp";
        outputFormat = "webp";
    }
  }

  const transformedBuffer = await pipeline.toBuffer();

  return {
    buffer: transformedBuffer,
    mimeType: outputMimeType,
    originalSize: buffer.length,
    transformedSize: transformedBuffer.length,
    metadata: {
      originalDimensions: {
        width: metadata.width,
        height: metadata.height,
      },
      newDimensions: {
        width: targetWidth,
        height: targetHeight,
      },
      format: outputFormat,
    },
  };
}

/**
 * Process an image for claim submission
 *
 * This is the main entry point that orchestrates the entire transformation process:
 * 1. Extract metadata
 * 2. Check if transformation is needed
 * 3. Transform if necessary
 * 4. Handle errors gracefully with fallback to original
 *
 * @param buffer - Original image buffer
 * @param mimeType - MIME type of the image
 * @param options - Transformation options
 * @returns Processed image data with transformation status
 */
export async function processImageForClaim(
  buffer: Buffer,
  mimeType: string,
  options?: TransformationOptions,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  transformed: boolean;
  stats?: TransformationResult;
}> {
  try {
    // Step 1: Extract metadata
    const metadata = await getImageMetadata(buffer);

    if (!metadata) {
      console.warn(
        "[ImageTransformService] Could not extract metadata, using original",
      );
      return {
        buffer,
        mimeType,
        transformed: false,
      };
    }

    // Step 2: Check if transformation is needed
    const needsTransform = shouldTransformImage(metadata, mimeType, options);

    if (!needsTransform) {
      console.log(
        `[ImageTransformService] Image ${metadata.width}x${metadata.height}px, no transformation needed`,
      );
      return {
        buffer,
        mimeType,
        transformed: false,
      };
    }

    // Step 3: Transform
    console.log(
      `[ImageTransformService] Transforming image: ${metadata.width}x${metadata.height}px → max ${options?.maxWidth || DEFAULT_OPTIONS.maxWidth}px width`,
    );

    const result = await transformImage(buffer, metadata, options);

    const reductionPercent = Math.round(
      ((result.originalSize - result.transformedSize) / result.originalSize) *
        100,
    );

    console.log(
      `[ImageTransformService] Transformation complete: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.transformedSize / 1024 / 1024).toFixed(2)}MB (${reductionPercent}% reduction)`,
    );

    return {
      buffer: result.buffer,
      mimeType: result.mimeType,
      transformed: true,
      stats: result,
    };
  } catch (error) {
    console.error(
      "[ImageTransformService] Transformation failed, using original:",
      error,
    );
    return {
      buffer,
      mimeType,
      transformed: false,
    };
  }
}
