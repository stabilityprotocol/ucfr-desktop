import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { UpdateBanner } from "./UpdateBanner";

interface LayoutProps {
  marks: any[];
}

export function Layout({ marks }: LayoutProps) {
  return (
    <div className="h-full w-full overflow-hidden grid grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar marks={marks} />
      <main className="relative h-full overflow-y-auto overflow-x-hidden bg-pattern-grid">
        <UpdateBanner />
        <Outlet />
      </main>
    </div>
  );
}
