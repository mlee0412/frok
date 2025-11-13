import { describe, it, expect, vi } from 'vitest';
import {
  validateFile,
  validateFiles,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isImageUrl,
  getFileIcon,
  STORAGE_BUCKET,
} from '../fileUpload';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabaseClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  })),
}));

describe('fileUpload utilities', () => {
  describe('File Validation', () => {
    describe('validateFile', () => {
      it('should accept valid image files under 10MB', () => {
        const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

        const result = validateFile(file);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should accept valid PDF files under 10MB', () => {
        const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }); // 3MB

        const result = validateFile(file);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject files over 10MB', () => {
        const file = new File(['content'], 'large.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB

        const result = validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds 10MB limit');
        expect(result.error).toContain('large.jpg');
      });

      it('should reject unsupported file types', () => {
        const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
        Object.defineProperty(file, 'size', { value: 1024 }); // 1KB

        const result = validateFile(file);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('not supported');
      });

      it('should accept all supported image types', () => {
        const types = [
          { name: 'image.jpg', type: 'image/jpeg' },
          { name: 'image.png', type: 'image/png' },
          { name: 'image.webp', type: 'image/webp' },
          { name: 'image.gif', type: 'image/gif' },
        ];

        types.forEach(({ name, type }) => {
          const file = new File(['content'], name, { type });
          Object.defineProperty(file, 'size', { value: 1024 });

          const result = validateFile(file);
          expect(result.valid).toBe(true);
        });
      });

      it('should accept all supported document types', () => {
        const types = [
          { name: 'doc.pdf', type: 'application/pdf' },
          { name: 'doc.doc', type: 'application/msword' },
          {
            name: 'doc.docx',
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          { name: 'doc.txt', type: 'text/plain' },
        ];

        types.forEach(({ name, type }) => {
          const file = new File(['content'], name, { type });
          Object.defineProperty(file, 'size', { value: 1024 });

          const result = validateFile(file);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('validateFiles', () => {
      it('should accept multiple valid files', () => {
        const files = [
          new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
          new File(['content'], 'doc.pdf', { type: 'application/pdf' }),
        ];
        files.forEach((file) => {
          Object.defineProperty(file, 'size', { value: 1024 });
        });

        const result = validateFiles(files);

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject empty file array', () => {
        const result = validateFiles([]);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('No files provided');
      });

      it('should reject more than 5 files', () => {
        const files = Array.from({ length: 6 }, (_, i) =>
          new File(['content'], `file${i}.jpg`, { type: 'image/jpeg' })
        );
        files.forEach((file) => {
          Object.defineProperty(file, 'size', { value: 1024 });
        });

        const result = validateFiles(files);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Maximum 5 files allowed per message');
      });

      it('should reject if any file is invalid', () => {
        const files = [
          new File(['content'], 'valid.jpg', { type: 'image/jpeg' }),
          new File(['content'], 'invalid.exe', { type: 'application/x-msdownload' }),
        ];
        files.forEach((file) => {
          Object.defineProperty(file, 'size', { value: 1024 });
        });

        const result = validateFiles(files);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('not supported');
      });

      it('should reject if any file exceeds size limit', () => {
        const files = [
          new File(['content'], 'small.jpg', { type: 'image/jpeg' }),
          new File(['content'], 'large.jpg', { type: 'image/jpeg' }),
        ];
        Object.defineProperty(files[0], 'size', { value: 1024 });
        Object.defineProperty(files[1], 'size', { value: 11 * 1024 * 1024 }); // 11MB

        const result = validateFiles(files);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds 10MB limit');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('formatFileSize', () => {
      it('should format bytes correctly', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(1023)).toBe('1023 B');
      });

      it('should format kilobytes correctly', () => {
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
      });

      it('should format megabytes correctly', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
      });

      it('should format gigabytes correctly', () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        expect(formatFileSize(2.7 * 1024 * 1024 * 1024)).toBe('2.7 GB');
      });
    });

    describe('getFileExtension', () => {
      it('should extract file extension correctly', () => {
        expect(getFileExtension('file.jpg')).toBe('jpg');
        expect(getFileExtension('document.pdf')).toBe('pdf');
        expect(getFileExtension('archive.tar.gz')).toBe('gz');
      });

      it('should handle files without extension', () => {
        expect(getFileExtension('README')).toBe('');
        expect(getFileExtension('noextension')).toBe('');
      });

      it('should handle uppercase extensions', () => {
        expect(getFileExtension('FILE.JPG')).toBe('jpg');
        expect(getFileExtension('DOCUMENT.PDF')).toBe('pdf');
      });

      it('should handle dots in filename', () => {
        expect(getFileExtension('my.file.name.txt')).toBe('txt');
      });
    });

    describe('isImageFile', () => {
      it('should identify image files correctly', () => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        imageTypes.forEach((type) => {
          const file = new File(['content'], 'test', { type });
          expect(isImageFile(file)).toBe(true);
        });
      });

      it('should reject non-image files', () => {
        const nonImageTypes = ['application/pdf', 'text/plain', 'application/msword'];

        nonImageTypes.forEach((type) => {
          const file = new File(['content'], 'test', { type });
          expect(isImageFile(file)).toBe(false);
        });
      });
    });

    describe('isImageUrl', () => {
      it('should identify image URLs correctly', () => {
        expect(isImageUrl('https://example.com/image.jpg')).toBe(true);
        expect(isImageUrl('https://example.com/image.jpeg')).toBe(true);
        expect(isImageUrl('https://example.com/image.png')).toBe(true);
        expect(isImageUrl('https://example.com/image.webp')).toBe(true);
        expect(isImageUrl('https://example.com/image.gif')).toBe(true);
      });

      it('should reject non-image URLs', () => {
        expect(isImageUrl('https://example.com/document.pdf')).toBe(false);
        expect(isImageUrl('https://example.com/file.txt')).toBe(false);
        expect(isImageUrl('https://example.com/page.html')).toBe(false);
      });

      it('should handle uppercase extensions', () => {
        expect(isImageUrl('https://example.com/IMAGE.JPG')).toBe(true);
        expect(isImageUrl('https://example.com/PHOTO.PNG')).toBe(true);
      });
    });

    describe('getFileIcon', () => {
      it('should return correct emoji for PDF files', () => {
        expect(getFileIcon('document.pdf')).toBe('📕');
      });

      it('should return correct emoji for Word files', () => {
        expect(getFileIcon('document.doc')).toBe('📘');
        expect(getFileIcon('document.docx')).toBe('📘');
      });

      it('should return correct emoji for text files', () => {
        expect(getFileIcon('notes.txt')).toBe('📄');
      });

      it('should return correct emoji for image files', () => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        imageExtensions.forEach((ext) => {
          expect(getFileIcon(`image.${ext}`)).toBe('🖼️');
        });
      });

      it('should return default emoji for unknown file types', () => {
        expect(getFileIcon('file.xyz')).toBe('📎');
        expect(getFileIcon('unknown')).toBe('📎');
      });

      it('should handle uppercase extensions', () => {
        expect(getFileIcon('IMAGE.JPG')).toBe('🖼️');
        expect(getFileIcon('DOCUMENT.PDF')).toBe('📕');
      });
    });
  });

  describe('Constants', () => {
    it('should export STORAGE_BUCKET constant', () => {
      expect(STORAGE_BUCKET).toBe('chat-attachments');
    });
  });
});
