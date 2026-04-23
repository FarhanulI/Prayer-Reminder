import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { fetchPrayerTimes, getDeviceToken, getLocation, saveDailyPrayerTimes, saveUserDeviceInfo } from '../device.service';

/**
 * Logs a user into the application using Firebase Authentication.
 * After successful authentication, it attempts to gather and update
 * the user's current device token and location data as a background task.
 *
 * @param {string} email - The user's registered email address
 * @param {string} password - The user's password
 * @returns {Promise<User>} The authenticated Firebase User object
 * @throws {Error} Will throw an error if Authentication fails (e.g., wrong password)
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  try {
    // Attempt to sync the latest device token and location upon successful login
    const [deviceToken, location] = await Promise.all([
      getDeviceToken(),
      getLocation(),
    ]);

    const prayerTimes = await fetchPrayerTimes(location?.coords.latitude, location?.coords.longitude)


    await saveUserDeviceInfo(user.uid, {
      deviceToken,
      location: location?.coords || null,
      date: prayerTimes?.date || null,
      sunTimings: {
        sunrise: prayerTimes?.prayerTimings.Sunrise || null,
        sunset: prayerTimes?.prayerTimings.Sunset || null,

      }
    });

    if (prayerTimes?.prayerTimings) {
      await saveDailyPrayerTimes(user.uid, prayerTimes.prayerTimings);
    }
  } catch (err) {
    // We only log this error instead of throwing because device sync
    // should not block the user from logging in successfully.
    console.log("Device setup failed on login:", err);
  }

  return user;
};

/**
 * Creates a new user account with Firebase Authentication and provisions
 * their initial profile and device metadata inside Firestore.
 * If the Firestore provisioning fails, the newly created Auth user is rolled back (deleted).
 *
 * @param {string} email - The user's email address
 * @param {string} password - The desired password
 * @param {string} name - The user's full name to display on their profile
 * @returns {Promise<User>} The newly created and authenticated Firebase User object
 * @throws {Error} Throws an error if the email is in use, or if the database setup fails
 */
export const signupUser = async (
  email: string,
  password: string,
  name: string
): Promise<User> => {
  // Step 1: Create the identity in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  if (!user?.uid) throw new Error("No User returned from Firebase");

  try {
    // Step 2: Initialize the core user profile document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name,
      email: user.email ?? email,
      subscription: "free",
      createdAt: serverTimestamp(),
    });

    // Step 3: Gather device characteristics (Push token + Geolocation)
    const [deviceToken, location] = await Promise.all([
      getDeviceToken(),
      getLocation(),
    ]);

    const prayerTimes = await fetchPrayerTimes(location?.coords.latitude, location?.coords.longitude);

    // Step 4: Attach the device info to the newly created profile
    await saveUserDeviceInfo(user.uid, {
      deviceToken,
      location: location?.coords || null,
      date: prayerTimes?.date || null,
      sunTimings: {
        sunrise: prayerTimes?.prayerTimings.Sunrise || null,
        sunset: prayerTimes?.prayerTimings.Sunset || null,
      }
    });

    if (prayerTimes?.prayerTimings) {
      await saveDailyPrayerTimes(user.uid, prayerTimes.prayerTimings);
    }
  } catch (err: any) {
    console.error("Signup device sync error:", err);

    // Rollback: If anything during the profile setup fails, delete the auth user
    // so we do not end up with an orphaned user without a database record.
    await user.delete().catch(() => signOut(auth));

    throw new Error(
      "Signup failed due to device setup or network issue"
    );
  }

  return user;
};


/**
 * Signs the current user out of their Firebase session.
 * This triggers `onAuthStateChanged` to redirect the application back to the login screen.
 *
 * @returns {Promise<void>} 
 */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};
