import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import Landing from "@/pages/Landing";
import Casos from "@/pages/Casos";
import Expediente from "@/pages/Expediente";
import RegistrarPartida from "@/pages/RegistrarPartida";
import Cartera from "@/pages/Cartera";
import MisInmuebles from "@/pages/MisInmuebles";
import Login from "@/pages/Login";
import Inmuebles from "@/pages/Inmuebles";
import FichaPublica from "@/pages/FichaPublica";
import Proyecto from "@/pages/Proyecto";
import FichaLote from "@/pages/FichaLote";
import ProyectosEquipo from "@/pages/ProyectosEquipo";
import CargaLotes from "@/pages/CargaLotes";
import Interesados from "@/pages/Interesados";
import Creditos from "@/pages/Creditos";
import { RequireAuth, RequireVista } from "@/lib/auth";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      // v1.0: portal público, sin sesión. Solo inmuebles publicados (el servidor da 404 a los demás).
      { path: "inmuebles", Component: Inmuebles },
      { path: "inmuebles/:codigo", Component: FichaPublica },
      // v1.0 (etapa 6): créditos de las imágenes, enlazados desde el pie.
      { path: "creditos", Component: Creditos },
      // v1.0 (etapa 3a): página pública de un proyecto (plano de lotes) y ficha de un lote sin caso propio.
      { path: "proyectos/:codigo", Component: Proyecto },
      { path: "proyectos/:codigo/lotes/:lote", Component: FichaLote },
      // v1.0 (etapa 3b): panel de proyectos y carga masiva de lotes por CSV (gestor y asesor).
      { path: "proyectos", element: <RequireVista vista="proyectos"><ProyectosEquipo /></RequireVista> },
      { path: "proyectos/:codigo/carga", element: <RequireVista vista="proyectos"><CargaLotes /></RequireVista> },
      { path: "casos", element: <RequireVista vista="casos"><Casos /></RequireVista> },
      { path: "casos/nueva", element: <RequireVista vista="registrar"><RegistrarPartida /></RequireVista> },
      // El detalle lo abre cualquier rol con sesión; el servidor decide qué caso puede ver (404 si no le corresponde).
      { path: "casos/:codigo", element: <RequireAuth><Expediente /></RequireAuth> },
      { path: "cartera", element: <RequireVista vista="cartera"><Cartera /></RequireVista> },
      { path: "interesados", element: <RequireVista vista="interesados"><Interesados /></RequireVista> },
      { path: "mis-inmuebles", element: <RequireVista vista="mis-inmuebles"><MisInmuebles /></RequireVista> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
