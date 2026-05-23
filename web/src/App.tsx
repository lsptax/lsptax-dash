import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPortal from "./page/AdminPortal";
import LandingPage from "./page/LandingPage";

import ProtectedRoute from "./utils/ProtectedRoute";
import LoginPage from "./page/LoginPage";
import NotFoundPage from "./page/NotFoundPage";
import { PortalRouteElements } from "./routes/portalRouteElements";
import PrivacyPolicyPage from "./page/PrivacyPolicyPage";
import TermsOfUsePage from "./page/TermsOfUsePage";

function App() {
  return (
    <Router>
      <a
        href="#main"
        className="sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:m-0 focus:w-auto focus:h-auto focus:overflow-visible focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfUsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <AdminPortal />
            </ProtectedRoute>
          }
        >
          {PortalRouteElements()}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
