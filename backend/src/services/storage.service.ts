import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const supabaseAdmin =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export interface ImageUploadPayload {
  buffer?: Buffer;
  mimeType: string;
  originalName?: string;
  publicUrl?: string; // Support direct image URL (e.g. Unsplash or pre-uploaded CDN)
  altText?: string;
  position?: number;
}

export class StorageService {
  private static ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

  static validateMimeType(mimeType: string): void {
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new AppError(
        `Invalid file type "${mimeType}". Allowed formats: JPEG, PNG, WebP.`,
        400,
        'INVALID_MIME_TYPE'
      );
    }
  }

  static validateFileSize(sizeBytes: number): void {
    if (sizeBytes > this.MAX_SIZE_BYTES) {
      throw new AppError(
        `Image size exceeds maximum limit of 2MB (${(sizeBytes / 1024 / 1024).toFixed(2)}MB).`,
        400,
        'FILE_TOO_LARGE'
      );
    }
  }

  /**
   * Upload image buffer to Supabase Storage bucket or resolve public image URL
   */
  static async uploadImage(
    productId: string,
    payload: ImageUploadPayload
  ): Promise<{ storagePath: string; publicUrl: string }> {
    this.validateMimeType(payload.mimeType);

    if (payload.buffer) {
      this.validateFileSize(payload.buffer.length);
    }

    // Direct URL support (for seeds, mock, or direct CDN links)
    if (payload.publicUrl && !payload.buffer) {
      const ext = payload.mimeType.split('/')[1] || 'jpg';
      const storagePath = `products/${productId}-${Date.now()}.${ext}`;
      return {
        storagePath,
        publicUrl: payload.publicUrl,
      };
    }

    if (!payload.buffer) {
      throw new AppError('Image file data is required.', 400, 'FILE_REQUIRED');
    }

    const ext = payload.mimeType.split('/')[1] || 'jpg';
    const filename = `${productId}-${Date.now()}.${ext}`;
    const storagePath = `products/${filename}`;

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .upload(storagePath, payload.buffer, {
          contentType: payload.mimeType,
          upsert: true,
        });

      if (error) {
        throw new AppError(`Supabase Storage upload failed: ${error.message}`, 500, 'STORAGE_ERROR');
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return {
        storagePath: data.path,
        publicUrl: publicUrlData.publicUrl,
      };
    }

    // Fallback if Supabase credentials are not configured
    const simulatedUrl = `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80`;
    return {
      storagePath,
      publicUrl: simulatedUrl,
    };
  }

  /**
   * Delete an object from Supabase Storage bucket
   */
  static async deleteImage(storagePath: string): Promise<void> {
    if (supabaseAdmin && storagePath) {
      try {
        await supabaseAdmin.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([storagePath]);
      } catch (err) {
        console.warn(`Failed to delete object from storage at ${storagePath}:`, err);
      }
    }
  }
}
