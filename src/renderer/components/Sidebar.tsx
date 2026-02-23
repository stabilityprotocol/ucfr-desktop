import { useRef, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { NavLink, useNavigate } from "react-router-dom";
import { Settings, ChevronDown, User } from "lucide-react";
import { activeOrgAtom, organizationsAtom } from "../state";

interface SidebarProps {
  marks: any[];
}

export function Sidebar({ marks }: SidebarProps) {
  const navigate = useNavigate();
  const [activeOrg, setActiveOrg] = useAtom(activeOrgAtom);
  const [organizations] = useAtom(organizationsAtom);
  const [isOrgSelectorOpen, setIsOrgSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOrgSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="border-r border-zinc-200/70 bg-stone-50 p-0 flex flex-col h-full">
      {/* Logo Area */}
      <div className="px-6 py-6 border-b border-zinc-200/60">
        <NavLink to="/" className="inline-flex items-center">
          <span className="text-[30px] leading-none font-semibold tracking-tight text-zinc-800">
            Monolith
          </span>
        </NavLink>
      </div>

      {/* Mark Selector */}
      <div className="px-4 my-5 relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOrgSelectorOpen(!isOrgSelectorOpen)}
          className="flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200/80 hover:border-zinc-300 transition-colors rounded-md cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            {activeOrg ? (
              <div className="h-8 w-8 bg-accent flex items-center justify-center rounded-sm flex-shrink-0">
                <span className="text-white font-bold text-xs">
                  {getInitials(activeOrg.name)}
                </span>
              </div>
            ) : (
              <div className="h-8 w-8 bg-zinc-200 flex items-center justify-center rounded-sm flex-shrink-0">
                <User size={16} className="text-zinc-600" />
              </div>
            )}
            <span className="font-medium text-sm text-zinc-900 truncate max-w-[140px]">
              {activeOrg ? activeOrg.name : "Personal Marks"}
            </span>
          </div>
          <ChevronDown
            size={14}
            className="text-zinc-400 group-hover:text-zinc-600"
          />
        </div>

        {isOrgSelectorOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto py-2">
            <div
              className={`px-3 py-3 hover:bg-zinc-50 cursor-pointer flex items-center gap-3 ${
                !activeOrg ? "bg-zinc-100" : ""
              }`}
              onClick={() => {
                setActiveOrg(null);
                setIsOrgSelectorOpen(false);
                navigate("/");
              }}
            >
              <div className="h-10 w-10 bg-zinc-200 flex items-center justify-center rounded-md flex-shrink-0">
                <User size={20} className="text-zinc-600" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-zinc-900 truncate">
                  PERSONAL MARKS
                </span>
                <span className="text-xs text-zinc-500 truncate">
                  Your own marks
                </span>
              </div>
            </div>

            {organizations.map((org) => (
              <div
                key={org.id}
                className={`px-3 py-3 hover:bg-zinc-50 cursor-pointer flex items-center gap-3 ${
                  activeOrg?.id === org.id ? "bg-zinc-100" : ""
                }`}
                onClick={() => {
                  setActiveOrg(org);
                  setIsOrgSelectorOpen(false);
                  navigate("/");
                }}
              >
                <div className="h-10 w-10 bg-accent flex items-center justify-center rounded-md flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {getInitials(org.name)}
                  </span>
                </div>
                <span className="text-sm font-medium text-zinc-900 truncate">
                  {org.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="flex flex-col flex-1 px-4 space-y-4">
        {/* Dashboard Link */}
        <div>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `w-full block text-left text-sm font-normal transition-colors px-2 py-1.5 rounded-md ${
                isActive
                  ? "bg-accent text-white"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-white"
              }`
            }
          >
            Recent Activity
          </NavLink>
        </div>

        {/* Marks Section */}
        <div>
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.14em] mb-2 px-2">
            Marks
          </div>
          <div className="flex flex-col gap-1">
            {marks.map((p) => (
              <NavLink
                key={p.id}
                to={`/marks/${p.id}`}
                className={({ isActive }) =>
                  `w-full block text-left text-sm font-normal transition-colors truncate px-3 py-1.5 rounded-md ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-white"
                  }`
                }
              >
                {p.name}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Settings */}
      <div className="p-4 mt-auto border-t border-zinc-200/60">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-full block text-left text-sm font-medium hover:text-zinc-900 transition-colors flex items-center gap-2 ${
              isActive ? "text-accent" : "text-zinc-500"
            }`
          }
        >
          <Settings size={16} /> Settings
        </NavLink>
      </div>
    </aside>
  );
}
