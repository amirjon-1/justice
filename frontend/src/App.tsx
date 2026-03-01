import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AnalyzePage from "./pages/AnalyzePage";
import AboutPage from "./pages/AboutPage";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <LandingPage />
          </>
        }
      />
      <Route path="/analyze" element={<AnalyzePage />} />
      <Route
        path="/about"
        element={
          <>
            <Navbar />
            <AboutPage />
          </>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;
