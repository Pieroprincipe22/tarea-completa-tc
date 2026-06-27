import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'tc';

    const accessKeyId = process.env.S3_ACCESS_KEY?.trim();
    const secretAccessKey = process.env.S3_SECRET_KEY?.trim();

    // Sin fallback a credenciales conocidas: si faltan, la API no arranca.
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'S3_ACCESS_KEY y S3_SECRET_KEY son obligatorias. Configúralas en el entorno (apps/api/.env).',
      );
    }

    this.s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true, // ✅ necesario para MinIO
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async putObject(key: string, body: Buffer, contentType?: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getSignedUrl(key: string) {
    const expiresIn = Number(process.env.S3_PRESIGN_EXP_SECONDS || 3600);
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn });
    return url;
  }
}