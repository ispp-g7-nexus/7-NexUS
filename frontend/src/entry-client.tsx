import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { readBootstrapData } from "./lib/bootstrap";
import { AppDataProvider } from "./providers/AppDataProvider";
import "./styles/index.css";

const initialData = readBootstrapData();

hydrateRoot(
  document.getElementById("root") as HTMLElement,
  <StrictMode>
    <AppDataProvider initialData={initialData}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppDataProvider>
  </StrictMode>
);
