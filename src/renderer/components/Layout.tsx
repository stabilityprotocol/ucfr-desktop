import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  projects: any[];
}

export function Layout({
  projects,
}: LayoutProps) {
  return (
    <div className="h-full grid grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar
        projects={projects}
      />
      <main className="min-h-full">
        <Outlet />
      </main>
    </div>
  );
}

