import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";

// Load app based on URL parameter: ?app=screenshare
const params = new URLSearchParams(window.location.search);
const appType = params.get("app");

async function loadApp() {
  let App;
  if (appType === "screenshare") {
    App = (await import("./App+Screenshare.tsx")).default;
  } else {
    App = (await import("./App+NextSession.tsx")).default;
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

loadApp();
