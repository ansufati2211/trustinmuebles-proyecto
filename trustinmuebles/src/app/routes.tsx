import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import Landing from "@/pages/Landing";
import Casos from "@/pages/Casos";
import Expediente from "@/pages/Expediente";
import RegistrarPartida from "@/pages/RegistrarPartida";
import Login from "@/pages/Login";
import { RequireAuth } from "@/lib/auth";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      { path: "casos", element: <RequireAuth><Casos /></RequireAuth> },
      { path: "casos/nueva", element: <RequireAuth><RegistrarPartida /></RequireAuth> },
      { path: "casos/:codigo", element: <RequireAuth><Expediente /></RequireAuth> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
