import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  projects: any[];
}

export function Layout({ projects }: LayoutProps) {
  return (
    <div className="h-full w-full overflow-hidden grid grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar projects={projects} />
      <main className="h-full overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
