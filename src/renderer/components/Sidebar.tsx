import { useRef, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { NavLink } from "react-router-dom";
import { Settings, ChevronDown, User } from "lucide-react";
import { activeOrgAtom, organizationsAtom } from "../state";
import monolithLogo from "../../assets/monolith-logo.png";

interface SidebarProps {
  projects: any[];
}

export function Sidebar({ projects }: SidebarProps) {
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
    <aside className="border-r border-gray-200 bg-white p-0 flex flex-col h-full">
      {/* Logo Area */}
      <div className="px-6 py-6">
        <NavLink to="/" className="flex items-center gap-3">
          <img src={monolithLogo} alt="Monolith Logo" className="h-12 w-auto" />
        </NavLink>
      </div>

      {/* Project Selector */}
      <div className="px-4 mb-6 relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOrgSelectorOpen(!isOrgSelectorOpen)}
          className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-sm cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            {activeOrg ? (
              <div className="h-8 w-8 bg-black flex items-center justify-center rounded-sm flex-shrink-0">
                <span className="text-white font-bold text-xs">
                  {getInitials(activeOrg.name)}
                </span>
              </div>
            ) : (
              <div className="h-8 w-8 bg-gray-200 flex items-center justify-center rounded-sm flex-shrink-0">
                <User size={16} className="text-gray-600" />
              </div>
            )}
            <span className="font-bold text-sm text-gray-900 uppercase tracking-wide truncate max-w-[140px]">
              {activeOrg ? activeOrg.name : "Personal Projects"}
            </span>
          </div>
          <ChevronDown
            size={14}
            className="text-gray-400 group-hover:text-gray-600"
          />
        </div>

        {isOrgSelectorOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-50 max-h-80 overflow-y-auto py-2">
            <div
              className={`px-3 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                !activeOrg ? "bg-gray-100" : ""
              }`}
              onClick={() => {
                setActiveOrg(null);
                setIsOrgSelectorOpen(false);
              }}
            >
              <div className="h-10 w-10 bg-gray-200 flex items-center justify-center rounded-sm flex-shrink-0">
                <User size={20} className="text-gray-600" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
                  PERSONAL PROJECTS
                </span>
                <span className="text-xs text-gray-500 truncate">
                  Your own projects
                </span>
              </div>
            </div>

            {organizations.map((org) => (
              <div
                key={org.id}
                className={`px-3 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                  activeOrg?.id === org.id ? "bg-gray-100" : ""
                }`}
                onClick={() => {
                  setActiveOrg(org);
                  setIsOrgSelectorOpen(false);
                }}
              >
                <div className="h-10 w-10 bg-black flex items-center justify-center rounded-sm flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {getInitials(org.name)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
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
              `w-full block text-left text-sm font-light transition-colors uppercase tracking-wide px-2 py-1.5 rounded-sm ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black hover:bg-gray-100"
              }`
            }
          >
            Dashboard
          </NavLink>
        </div>

        {/* Projects Section */}
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 px-2">
            Projects
          </div>
          <div className="flex flex-col gap-1">
            {projects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}`}
                className={({ isActive }) =>
                  `w-full block text-left text-sm font-light transition-colors uppercase tracking-wide truncate px-3 py-1.5 rounded-sm ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
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
      <div className="p-4 mt-auto border-t border-gray-100">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-full block text-left text-sm font-medium hover:text-black transition-colors uppercase tracking-wide flex items-center gap-2 ${
              isActive ? "text-black font-bold" : "text-gray-500"
            }`
          }
        >
          <Settings size={16} /> Settings
        </NavLink>
      </div>
    </aside>
  );
}
