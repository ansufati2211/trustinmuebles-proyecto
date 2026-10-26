import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import Landing from "@/pages/Landing";
import Casos from "@/pages/Casos";
import Expediente from "@/pages/Expediente";
import RegistrarPartida from "@/pages/RegistrarPartida";
import Cartera from "@/pages/Cartera";
import MisInmuebles from "@/pages/MisInmuebles";
import Login from "@/pages/Login";
import { RequireAuth, RequireVista } from "@/lib/auth";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      { path: "casos", element: <RequireVista vista="casos"><Casos /></RequireVista> },
      { path: "casos/nueva", element: <RequireVista vista="registrar"><RegistrarPartida /></RequireVista> },
      // El detalle lo abre cualquier rol con sesión; el servidor decide qué caso puede ver (404 si no le corresponde).
      { path: "casos/:codigo", element: <RequireAuth><Expediente /></RequireAuth> },
      { path: "cartera", element: <RequireVista vista="cartera"><Cartera /></RequireVista> },
      { path: "mis-inmuebles", element: <RequireVista vista="mis-inmuebles"><MisInmuebles /></RequireVista> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
