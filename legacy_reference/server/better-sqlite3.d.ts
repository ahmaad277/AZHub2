declare module "better-sqlite3" {
  // Minimal typing for local SQLite usage (full types via @types/better-sqlite3 optional)
  class Database {
    constructor(path: string);
    pragma(source: string): unknown;
    exec(sql: string): unknown;
    close(): void;
  }
  export default Database;
}
