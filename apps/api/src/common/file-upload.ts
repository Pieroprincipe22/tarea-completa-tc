import { BadRequestException } from '@nestjs/common';

// Tipos permitidos: imágenes (incluye HEIC de iPhone, útil para técnicos en campo) y PDF.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const imageAndPdfUploadOptions = {
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF, HEIC) y PDF.`,
      ),
      false,
    );
  },
};

// Logo de la empresa: solo imágenes ligeras y sin SVG (un SVG puede llevar código).
const LOGO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export const logoUploadOptions = {
  limits: { fileSize: MAX_LOGO_BYTES },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (LOGO_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new BadRequestException('El logo tiene que ser una imagen PNG, JPG o WEBP.'), false);
  },
};