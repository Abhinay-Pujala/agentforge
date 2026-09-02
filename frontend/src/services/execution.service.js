import axios from "axios";
import { auth } from "../config/firebaseConfig.js";

const BASE_URL = `${import.meta.env.VITE_BACKEND_BASE_URL}/api/executions`;

async function getAuthHeaders() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be logged in.");
  }

  const idToken = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${idToken}`,
  };
}

export async function getExecutions({
  workerId,
  status,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) {
  const headers = await getAuthHeaders();

  const response = await axios({
    method: "GET",
    url: BASE_URL,
    headers,
    params: {
      workerId,
      status,
      from,
      to,
      page,
      limit,
    },
  });

  return {
    executions: response.data.data,
    pagination: response.data.pagination,
  };
}

export async function getExecutionById(id) {
  const headers = await getAuthHeaders();

  const response = await axios({
    method: "GET",
    url: `${BASE_URL}/${id}`,
    headers,
  });

  return response.data.data;
}
