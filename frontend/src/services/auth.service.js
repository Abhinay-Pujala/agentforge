import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

import { auth } from "../config/firebaseConfig.js";
import axios from "axios";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  return {
    user: result.user,
    idToken,
  };
}

export async function logOut() {
  await signOut(auth);
}

export async function syncUser(idToken) {
  const response = await axios({
    method: "post",
    url: `${import.meta.env.VITE_BACKEND_BASE_URL}/api/auth/sync`,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: {},
  });

  return response.data;
}
