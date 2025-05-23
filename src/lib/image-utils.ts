
'use client';

interface CompressImageOptions {
  quality?: number;
  type?: string; // e.g., 'image/jpeg', 'image/webp', 'image/png'
  maxWidth?: number;
  maxHeight?: number;
}

export function compressImage(
  dataUrl: string,
  options: CompressImageOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const { quality = 0.75, type = 'image/jpeg', maxWidth = 1024, maxHeight = 1024 } = options;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Failed to get canvas context'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL(type, quality);
      resolve(compressedDataUrl);
    };
    img.onerror = (error) => {
      console.error("Image load error for compression:", error);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = dataUrl;
  });
}
