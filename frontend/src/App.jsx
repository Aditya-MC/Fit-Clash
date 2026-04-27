import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import GroupPage from "./pages/GroupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import StravaCallbackPage from "./pages/StravaCallbackPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/strava/callback" element={<StravaCallbackPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="groups/:groupId" element={<GroupPage />} />
      </Route>
    </Routes>
  );
}
