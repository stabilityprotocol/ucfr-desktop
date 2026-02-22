import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  token: text("token"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const files = sqliteTable(
  "files",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email")
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    path: text("path").notNull(),
    currentHash: text("current_hash"),
    submitted: integer("submitted", { mode: "number" }).notNull().default(0),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    uniqueUserPath: uniqueIndex("idx_files_user_path_unique").on(table.userEmail, table.path),
    idxFilesUserEmail: index("idx_files_user_email").on(table.userEmail),
    idxFilesPath: index("idx_files_path").on(table.path),
    uniqueUserHash: uniqueIndex("idx_files_user_hash").on(table.userEmail, table.currentHash),
  }),
);

export const fileHistory = sqliteTable(
  "file_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email")
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    fileId: integer("file_id").references(() => files.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    hash: text("hash"),
    eventType: text("event_type").notNull(),
    timestamp: integer("timestamp", { mode: "number" }).notNull(),
  },
  (table) => ({
    idxFileHistoryUserEmail: index("idx_file_history_user_email").on(table.userEmail),
    idxFileHistoryFileId: index("idx_file_history_file_id").on(table.fileId),
    idxFileHistoryTimestamp: index("idx_file_history_timestamp").on(table.timestamp),
    uniqueUserFileHash: uniqueIndex("idx_file_history_user_file_hash").on(
      table.userEmail,
      table.fileId,
      table.hash,
    ),
  }),
);

export const config = sqliteTable(
  "config",
  {
    userEmail: text("user_email")
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userEmail, table.key] }),
    idxConfigUserEmail: index("idx_config_user_email").on(table.userEmail),
  }),
);

export const watchedFolders = sqliteTable(
  "watched_folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email")
      .notNull()
      .references(() => users.email, { onDelete: "cascade" }),
    markId: text("mark_id").notNull(),
    folderPath: text("folder_path").notNull(),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    uniqueUserMarkFolder: uniqueIndex("idx_watched_folders_user_mark_folder").on(
      table.userEmail,
      table.markId,
      table.folderPath,
    ),
    idxWatchedFoldersUserEmail: index("idx_watched_folders_user_email").on(table.userEmail),
    idxWatchedFoldersMarkId: index("idx_watched_folders_mark_id").on(table.markId),
  }),
);
