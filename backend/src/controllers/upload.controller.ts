import type { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler.ts';
import { ApiResponse } from '../utils/apiResponse.ts';
import { ApiError } from '../utils/apiError.ts';
import {
  uploadFileToS3,
  deleteFileFromS3,
  getPresignedUploadUrl,
  getS3PublicUrl,
} from '../db/s3.ts';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max
  },
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded. Please provide a file in the form field "file".');
  }

  const ext = path.extname(req.file.originalname) || '';
  const sanitizedBase = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueKey = `uploads/${Date.now()}-${sanitizedBase}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  const result = await uploadFileToS3({
    fileBuffer: req.file.buffer,
    key: uniqueKey,
    contentType: req.file.mimetype,
    originalName: req.file.originalname,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        url: result.url,
        key: result.key,
        originalName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype,
      },
      'File uploaded to AWS S3 successfully'
    )
  );
});

export const getUploadPresignedUrl = asyncHandler(async (req: Request, res: Response) => {
  const { filename, contentType, folder = 'uploads' } = req.body;

  if (!filename || !contentType) {
    throw new ApiError(400, 'filename and contentType are required');
  }

  const ext = path.extname(filename) || '';
  const sanitizedBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  const key = `${folder}/${Date.now()}-${sanitizedBase}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);
  const publicUrl = getS3PublicUrl(key);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        uploadUrl,
        publicUrl,
        key,
      },
      'Presigned upload URL generated successfully'
    )
  );
});

export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const paramKey = req.params.key;
  const key = Array.isArray(paramKey)
    ? paramKey.join('/')
    : (paramKey || (req.query.key as string) || (req.body && req.body.key));

  if (!key) {
    throw new ApiError(400, 'S3 key is required');
  }

  await deleteFileFromS3(key);

  return res.status(200).json(new ApiResponse(200, { key }, 'File deleted from AWS S3 successfully'));
});
