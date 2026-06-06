import { auth, db } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { refreshApplicationData } from '../device.service';

export type GoogleSignInFailureReason =
  | 'cancelled'
  | 'network'
  | 'native_unavailable'
  | 'developer_config'
  | 'unknown';

const DEVELOPER_ERROR_MESSAGE =
  'Google Sign-In is misconfigured (DEVELOPER_ERROR). For EAS builds: run "eas credentials -p android", copy the SHA-1 fingerprint, add it in Firebase → Project settings → Your Android app (com.farhanul.prayerreminder) → Add fingerprint, then download a new google-services.json, replace the file in your project, and run a new EAS development build.';

export class GoogleSignInError extends Error {
  readonly reason: GoogleSignInFailureReason;

  constructor(reason: GoogleSignInFailureReason, message: string) {
    super(message);
    this.name = 'GoogleSignInError';
    this.reason = reason;
  }
}

export type GoogleSignInResult = {
  user: User;
  isNewUser: boolean;
  onboardingCompleted: boolean;
};

const NATIVE_UNAVAILABLE_MESSAGE =
  'Google Sign-In is not in this dev client. Run a new EAS development build (eas build --profile development), install that APK/IPA on your device, then start the app with npx expo start --dev-client. Expo Go and older dev clients do not include this native module.';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let googleSignInModule: GoogleSignInModule | null = null;
let configured = false;

/** True when the native RNGoogleSignin module is linked in the current binary. */
export function isGoogleSignInNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;

  try {
    return (
      TurboModuleRegistry.get('RNGoogleSignin') != null ||
      NativeModules.RNGoogleSignin != null
    );
  } catch {
    return false;
  }
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule> {
  if (!isGoogleSignInNativeAvailable()) {
    throw new GoogleSignInError('native_unavailable', NATIVE_UNAVAILABLE_MESSAGE);
  }

  if (!googleSignInModule) {
    googleSignInModule = await import('@react-native-google-signin/google-signin');
  }

  return googleSignInModule;
}

export async function configureGoogleSignIn(): Promise<void> {
  if (configured) return;

  const { GoogleSignin } = await loadGoogleSignInModule();
  const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

  if (!webClientId) {
    console.warn(
      'EXPO_PUBLIC_WEB_CLIENT_ID is missing. Google Sign-In will not work until it is set.'
    );
  }

  GoogleSignin.configure({
    webClientId: webClientId ?? '',
  });

  configured = true;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof GoogleSignInError && error.reason === 'network') {
    return true;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  if (code === 'auth/network-request-failed') {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('internet') ||
      message.includes('connection')
    );
  }

  return false;
}

function isDeveloperConfigError(error: unknown): boolean {
  if (error instanceof GoogleSignInError && error.reason === 'developer_config') {
    return true;
  }

  const message =
    error instanceof Error ? error.message : String(error ?? '');

  return message.includes('DEVELOPER_ERROR');
}

function isNativeModuleMissingError(error: unknown): boolean {
  if (error instanceof GoogleSignInError && error.reason === 'native_unavailable') {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes('RNGoogleSignin');
  }

  return false;
}

async function ensureUserProfile(
  user: User,
): Promise<{ isNewUser: boolean; onboardingCompleted: boolean }> {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  console.log({ isEx: snapshot.data() });


  if (snapshot.exists()) {
    const data = snapshot.data();
    return { isNewUser: false, onboardingCompleted: !!data?.onboardingCompleted };
  }

  // await setDoc(userRef, {
  //   profile: {
  //     uid: user.uid,
  //     email: user.email,
  //     photoURL: user.photoURL,
  //     name: user.displayName ?? 'User',
  //     subscription: 'free',
  //   },
  //   createdAt: serverTimestamp(),
  // });

  return { isNewUser: true, onboardingCompleted: false };
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  await configureGoogleSignIn();

  const {
    GoogleSignin,
    isCancelledResponse,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
  } = await loadGoogleSignInModule();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      throw new GoogleSignInError('cancelled', 'Sign in was cancelled');
    }

    if (!isSuccessResponse(response)) {
      throw new GoogleSignInError('unknown', 'Google sign in failed');
    }

    let idToken = response.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }

    if (!idToken) {
      throw new GoogleSignInError(
        'unknown',
        'No ID token received from Google. Check your webClientId configuration.'
      );
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const { isNewUser, onboardingCompleted } = await ensureUserProfile(
      user,
    );

    try {
      await refreshApplicationData(user.uid);
    } catch (err) {
      console.log('Device setup failed on Google sign in:', err);
    }

    return { user, isNewUser, onboardingCompleted };
  } catch (error) {
    if (error instanceof GoogleSignInError) {
      throw error;
    }

    if (isNativeModuleMissingError(error)) {
      throw new GoogleSignInError('native_unavailable', NATIVE_UNAVAILABLE_MESSAGE);
    }

    if (isDeveloperConfigError(error)) {
      throw new GoogleSignInError('developer_config', DEVELOPER_ERROR_MESSAGE);
    }

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new GoogleSignInError('cancelled', 'Sign in was cancelled');
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        throw new GoogleSignInError('unknown', 'Sign in is already in progress');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError(
          'unknown',
          'Google Play Services are not available on this device'
        );
      }
    }

    if (isNetworkError(error)) {
      throw new GoogleSignInError(
        'network',
        'Network error. Check your connection and try again.'
      );
    }

    throw error;
  }
}

/** Best-effort Google session cleanup; safe when native module is absent. */
export async function signOutGoogleSession(): Promise<void> {
  if (!isGoogleSignInNativeAvailable()) return;

  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const hasSignedIn = await GoogleSignin.hasPreviousSignIn();
    if (hasSignedIn) {
      await GoogleSignin.signOut();
    }
  } catch {
    /* ignore */
  }
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (error instanceof GoogleSignInError) {
    return error.message;
  }

  if (isNativeModuleMissingError(error)) {
    return NATIVE_UNAVAILABLE_MESSAGE;
  }

  if (isDeveloperConfigError(error)) {
    return DEVELOPER_ERROR_MESSAGE;
  }

  if (isNetworkError(error)) {
    return 'Network error. Check your connection and try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Google sign in failed. Please try again.';
}
