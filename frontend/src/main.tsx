import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { App } from "./App";
import "./i18n";
import "./styles.css";
import "./polish.css";
import "./materials.css";

const Router = window.nexusDesktop ? MemoryRouter : BrowserRouter;
createRoot(document.getElementById("root")!).render(<React.StrictMode><Router><App /></Router></React.StrictMode>);
