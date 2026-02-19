import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";

import { App } from "./App";
import { AppDataProvider } from "./providers/AppDataProvider";
import type { AppBootstrapData } from "./types/app";
import "./styles/index.css";

export async function render(url: string, initialData: AppBootstrapData): Promise<string> {
  return renderToString(
    <AppDataProvider initialData={initialData}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </AppDataProvider>
  );
}
