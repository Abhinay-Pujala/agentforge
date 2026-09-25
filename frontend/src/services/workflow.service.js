import axios from "axios";
import { auth } from "../config/firebaseConfig.js";

const BASE_URL = `${import.meta.env.VITE_BACKEND_BASE_URL}/api/workflows`;

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please log in first.");
  }

  const idToken = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

export async function getWorkflows(params = {}) {
  const response = await axios({
    method: "GET",
    url: BASE_URL,
    headers: await getAuthHeaders(),
    params,
  });

  return response.data.data;
}

export async function getWorkflowById(id) {
  const response = await axios({
    method: "GET",
    url: `${BASE_URL}/${id}`,
    headers: await getAuthHeaders(),
  });

  return response.data.data;
}
