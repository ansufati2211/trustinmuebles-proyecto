import { createHashRouter } from "react-router"; 
import { AppShell } from "./AppShell";
import Landing from "@/pages/Landing";
import Search from "@/pages/Search";
import PropertyDetail from "@/pages/PropertyDetail";
import Transaction from "@/pages/Transaction";
import TransactionRedirect from "@/pages/TransactionRedirect";
import PostSale from "@/pages/PostSale";
import Login from "@/pages/Login";
import { RequireAuth } from "@/lib/auth";

export const router = createHashRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, Component: Landing },
      { path: "search", Component: Search },
      { path: "property/:id", Component: PropertyDetail },
      { path: "login", Component: Login },
      { path: "transaction", element: <RequireAuth><TransactionRedirect /></RequireAuth> },
      { path: "transaction/:id", element: <RequireAuth><Transaction /></RequireAuth> },
      { path: "post-sale", element: <RequireAuth><PostSale /></RequireAuth> },
    ],
  },
]);
