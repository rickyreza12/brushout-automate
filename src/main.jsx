import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { getToken } from "./api/client";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/LoginPage";
import "./styles/index.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));
  return loggedIn ? <Dashboard onLogout={() => setLoggedIn(false)} /> : <LoginPage onLogin={() => setLoggedIn(true)} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
