import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { env } from './env';

const firebaseConfig = env.firebase;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);