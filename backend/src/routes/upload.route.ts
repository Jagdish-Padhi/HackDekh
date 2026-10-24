import { Router } from 'express';
import {
  uploadFile,
  uploadMiddleware,
  getUploadPresignedUrl,
  deleteFile,
} from '../controllers/upload.controller.ts';
import { verifyJWT } from '../middlewares/auth.middleware.ts';

const router = Router();

// Upload a file directly to AWS S3 (multipart form-data with field name "file")
router.post('/', verifyJWT, uploadMiddleware.single('file'), uploadFile);

// Generate presigned S3 upload URL for direct client-to-S3 uploads
router.post('/presigned-url', verifyJWT, getUploadPresignedUrl);

// Delete a file from AWS S3 by key (supports query param ?key=... or route path /*key)
router.delete('/', verifyJWT, deleteFile);
router.delete('/*key', verifyJWT, deleteFile);

export default router;
