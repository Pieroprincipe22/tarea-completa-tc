import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    // 'tc' solo (2 caracteres) es un nombre de bucket S3 inválido (mínimo 3).
    this.bucket = process.env.S3_BUCKET || 'tc-mantenimiento';

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

  /**
   * Crea el bucket al arrancar si no existe, para no tener que hacerlo a mano
   * en cada entorno nuevo. Si falla (p. ej. credenciales sin permiso para crear
   * buckets, como algunas de R2), solo avisa: la API sigue arrancando.
   */
  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err: unknown) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      const notFound =
        e?.name === 'NotFound' ||
        e?.name === 'NoSuchBucket' ||
        e?.$metadata?.httpStatusCode === 404;

      if (!notFound) {
        this.logger.warn(
          `No se pudo comprobar el bucket "${this.bucket}": ${e?.name ?? String(err)}`,
        );
        return;
      }

      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" creado.`);
      } catch (createErr: unknown) {
        this.logger.warn(
          `No se pudo crear el bucket "${this.bucket}": ${
            createErr instanceof Error ? createErr.message : String(createErr)
          }`,
        );
      }
    }
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