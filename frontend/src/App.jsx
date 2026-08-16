import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import Workers from "./pages/Workers.jsx";
import CreateWorker from "./pages/CreateWorker.jsx";
import WorkerDetails from "./pages/WorkerDetails.jsx";
import EditWorker from "./pages/EditWorker.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/workers"
          element={
            <ProtectedRoute>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/workers/new"
          element={
            <ProtectedRoute>
              <CreateWorker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/workers/:id"
          element={
            <ProtectedRoute>
              <WorkerDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/workers/:id/edit"
          element={
            <ProtectedRoute>
              <EditWorker />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
