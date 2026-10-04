import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import axios from 'axios';

let isFirebaseAdminInitialized = false;

export function initializeFirebaseAdmin() {
  if (isFirebaseAdminInitialized || getApps().length > 0) {
    isFirebaseAdminInitialized = true;
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isFirebaseAdminInitialized = true;
      console.log('[Firebase Admin] Initialized successfully with Service Account.');
    } catch (err: any) {
      console.warn('[Firebase Admin] Service account initialization error:', err.message);
    }
  } else if (projectId) {
    try {
      initializeApp({
        projectId,
      });
      isFirebaseAdminInitialized = true;
      console.log('[Firebase Admin] Initialized with Project ID.');
    } catch (err: any) {
      console.warn('[Firebase Admin] Project ID initialized error:', err.message);
    }
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name?: string | undefined;
  picture?: string | undefined;
  emailVerified: boolean;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }

  initializeFirebaseAdmin();

  if (isFirebaseAdminInitialized || getApps().length > 0) {
    try {
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name,
        picture: decodedToken.picture,
        emailVerified: Boolean(decodedToken.email_verified),
      };
    } catch (adminErr: any) {
      console.warn('[Firebase Admin] Admin verifyIdToken fallback:', adminErr.message);
    }
  }

  try {
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    const data = response.data;

    if (!data.email) {
      throw new Error('Google token did not contain a valid email address');
    }

    return {
      uid: data.sub || data.user_id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.email_verified === 'true' || data.email_verified === true,
    };
  } catch (axiosErr: any) {
    throw new Error(
      axiosErr.response?.data?.error_description || axiosErr.message || 'Invalid Firebase ID token'
    );
  }
}
