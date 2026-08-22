import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const region = process.env.AWS_REGION || "ap-south-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN || undefined;

  // If credentials are provided (either local dummy or real/AWS Academy keys)
  const credentials =
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken ? { sessionToken } : {}),
        }
      : undefined;

  s3Client = new S3Client({
    region,
    ...(credentials ? { credentials } : {}),
  });

  return s3Client;
}

export function getS3BucketName(): string {
  return process.env.AWS_S3_BUCKET_NAME || "hackdekh-stage-deliverables";
}

/**
 * Generates the public S3 URL for a given key.
 */
export function getS3PublicUrl(key: string): string {
  const bucket = getS3BucketName();
  const region = process.env.AWS_REGION || "ap-south-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Uploads a buffer directly to S3.
 */
export async function uploadFileToS3(params: {
  fileBuffer: Buffer;
  key: string;
  contentType: string;
  originalName?: string;
}): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = getS3BucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: params.fileBuffer,
    ContentType: params.contentType,
    Metadata: params.originalName
      ? { "original-filename": encodeURIComponent(params.originalName) }
      : undefined,
  });

  await client.send(command);

  return {
    key: params.key,
    url: getS3PublicUrl(params.key),
  };
}

/**
 * Deletes an object from S3.
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = getS3BucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generates a presigned GET URL for secure downloading/viewing.
 */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const bucket = getS3BucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}
