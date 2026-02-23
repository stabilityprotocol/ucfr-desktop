import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  ExternalLink,
  File,
  FileCode,
  FileText,
  Image,
  MapPin,
  Music,
  Video,
} from "lucide-react";

type ArtifactCardProps = {
  path: string;
  eventType: string;
  timestamp: string | number;
  hash: string;
  markName?: string | null;
  onClick?: () => void;
};

const getFileName = (path: string) => {
  return path.split(/[/\\]/).pop() || path;
};

const getParentFolder = (path: string) => {
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) return "Unknown location";

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return "Unknown location";

  const parentParts = parts.slice(0, -1);
  const prefix = normalized.startsWith("/") ? "/" : "";
  return `${prefix}${parentParts.join("/")}`;
};

const getDisplayFolder = (folderPath: string) => {
  if (folderPath === "Unknown location") return folderPath;

  const homeCompact = folderPath.replace(/^\/Users\/[^/]+/, "~");
  const maxLength = 34;
  if (homeCompact.length <= maxLength) return homeCompact;

  const start = homeCompact.slice(0, 14);
  const end = homeCompact.slice(-14);
  return `${start}...${end}`;
};

const formatTime = (ts: string | number) => {
  const date = new Date(Number(ts) * 1000);
  const now = new Date();
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return date.toLocaleString();
};

const getFileIcon = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() || "";

  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v"];
  const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const codeExts = [
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "css",
    "scss",
    "json",
    "xml",
    "py",
    "java",
    "cpp",
    "c",
    "h",
    "php",
    "rb",
    "go",
    "rs",
  ];
  const docExts = ["pdf", "doc", "docx", "txt", "rtf", "odt", "md"];

  if (imageExts.includes(ext)) {
    return { Icon: Image, color: "text-fuchsia-600", bg: "bg-fuchsia-50" };
  }
  if (videoExts.includes(ext)) {
    return { Icon: Video, color: "text-rose-600", bg: "bg-rose-50" };
  }
  if (audioExts.includes(ext)) {
    return { Icon: Music, color: "text-amber-600", bg: "bg-amber-50" };
  }
  if (archiveExts.includes(ext)) {
    return { Icon: Archive, color: "text-orange-600", bg: "bg-orange-50" };
  }
  if (codeExts.includes(ext)) {
    return { Icon: FileCode, color: "text-cyan-600", bg: "bg-cyan-50" };
  }
  if (docExts.includes(ext)) {
    return { Icon: FileText, color: "text-blue-600", bg: "bg-blue-50" };
  }

  return { Icon: File, color: "text-zinc-500", bg: "bg-zinc-100" };
};

export function ArtifactCard({
  path,
  eventType,
  timestamp,
  hash,
  markName,
  onClick,
}: ArtifactCardProps) {
  const { Icon, color, bg } = getFileIcon(path);
  const parentFolder = getParentFolder(path);
  const displayFolder = getDisplayFolder(parentFolder);

  return (
    <div
      className={`group relative rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="absolute right-4 top-4 rounded bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-500" title={hash}>
        #{hash?.substring(0, 8)}
      </div>
      <div className="absolute bottom-4 right-4">
        <ExternalLink className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-400" />
      </div>
      <div className="min-w-0 pr-24">
          <div className="mb-2 flex items-center gap-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <h3 className="truncate pr-6 font-medium text-zinc-900" title={path}>
              {getFileName(path)}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                eventType === "add"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : eventType === "change"
                    ? "border-blue-100 bg-blue-50 text-blue-700"
                    : eventType === "move" || eventType === "rename"
                      ? "border-amber-100 bg-amber-50 text-amber-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}
            >
              {eventType.toUpperCase()}
            </span>
            <span
              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-500 md:max-w-[300px]"
              title={parentFolder}
            >
              <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
              <span className="truncate">{displayFolder}</span>
            </span>
            {markName && (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                {markName}
              </span>
            )}
            <span className="text-xs text-zinc-400">{formatTime(timestamp)}</span>
          </div>
        </div>
    </div>
  );
}
