import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}