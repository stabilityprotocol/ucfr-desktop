import { useParams, Link } from "react-router-dom";
import { useAtom } from "jotai";
import type { ProjectWithClaimsCount } from "../../shared/api/types";
import { MarkDetailPage } from "./MarkDetail";
import { LayoutGrid, ExternalLink } from "lucide-react";
import { currentUserAtom } from "../state";

type MarksPageProps = {
  marks: ProjectWithClaimsCount[];
};

export function MarksPage({ marks }: MarksPageProps) {
  const [currentUser] = useAtom(currentUserAtom);
  const { markId } = useParams();
  const activeMark = markId
    ? marks.find((p) => p.id === markId) || null
    : null;

  if (activeMark) {
    return <MarkDetailPage marks={marks} />;
  }

  // Shared empty/list container style
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full max-w-5xl mx-auto p-8 md:p-12">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <LayoutGrid className="w-6 h-6 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Marks
          </h1>
        </div>
        <p className="text-zinc-500 text-sm ml-11">
          {marks.length === 0
            ? "Marks will appear here once they're available in your workspace."
            : "Browse the marks that Monolith keeps in sync."}
        </p>
      </header>
      {children}
    </div>
  );

  if (marks.length === 0) {
    return (
      <Container>
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-12 text-center">
          <p className="text-zinc-500 text-sm">No marks found.</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {marks.map((mark) => {
          // A shared personal mark is one where the user is a member but not the admin,
          // and the mark doesn't belong to an organization.
          const isSharedPersonalMark =
            !mark.organization?.id &&
            mark.admin?.email !== currentUser &&
            Boolean(currentUser) &&
            mark.members.some(
              (m: { email?: string; username?: string }) =>
                m.email === currentUser || m.username === currentUser,
            );

          return (
            <Link
              key={mark.id}
              to={`/marks/${mark.id}`}
              className="group relative flex flex-col gap-2 p-4 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div>
                <h3 className="font-medium text-zinc-900 truncate pr-6">
                  {mark.name}
                </h3>
                {isSharedPersonalMark && (
                  <div className="mt-1 text-[9px] leading-none font-semibold tracking-[0.12em] uppercase text-zinc-500">
                    MEMBER
                  </div>
                )}
              </div>
              {mark.claimsCount != null && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-zinc-100 font-medium text-zinc-700 tabular-nums">
                    {mark.claimsCount}
                  </span>
                  <span>
                    {mark.claimsCount === 1 ? "artifact" : "artifacts"}
                  </span>
                </div>
              )}
              <div className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-400 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
