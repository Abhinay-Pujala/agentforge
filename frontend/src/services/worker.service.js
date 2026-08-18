import axios from "axios";
import { auth } from "../config/firebaseConfig.js";

const BASE_URL = `${import.meta.env.VITE_BACKEND_BASE_URL}/api/workers`;

export async function createWorker(workerData) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to create worker");
  }

  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "POST",
    url: BASE_URL,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: workerData,
  });

  return response.data.data;
}

export async function getWorkers() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Please log in first.");
  }
  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "GET",
    url: BASE_URL,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: {},
  });

  return response.data.data;
}

export async function getWorkerById(id) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You much logged in to fetch workers");
  }

  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "GET",
    url: `${BASE_URL}/${id}`,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: {},
  });

  return response.data.data;
}

export async function updateWorker(id, workerData) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must logged in to update worker");
  }
  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "PUT",
    url: `${BASE_URL}/${id}`,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: workerData,
  });

  return response.data.data;
}

export async function updateWorkerStatus(id, status) {
  return updateWorker(id, { status });
}

export async function deleteWorker(id) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be logged in to delete the worker.");
  }

  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "delete",
    url: `${BASE_URL}/${id}`,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  return response.data.data;
}

export async function runWorker(id, input) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("You must be logged in to run the worker.");
  }

  const idToken = await currentUser.getIdToken();

  const response = await axios({
    method: "POST",
    url: `${BASE_URL}/${id}/run`,
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    data: {
      input,
    },
  });

  return response.data.data;
}
