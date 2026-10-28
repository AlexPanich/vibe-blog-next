/* ============================================================================
 *
 *   ██████╗ ███████╗██╗   ██╗      ██████╗ ███╗   ██╗██╗  ██╗   ██╗██╗
 *   ██╔══██╗██╔════╝██║   ██║     ██╔═══██╗████╗  ██║██║  ╚██╗ ██╔╝██║
 *   ██║  ██║█████╗  ██║   ██║     ██║   ██║██╔██╗ ██║██║   ╚████╔╝ ██║
 *   ██║  ██║██╔══╝  ╚██╗ ██╔╝     ██║   ██║██║╚██╗██║██║    ╚██╔╝  ╚═╝
 *   ██████╔╝███████╗ ╚████╔╝      ╚██████╔╝██║ ╚████║███████╗██║   ██╗
 *   ╚═════╝ ╚══════╝  ╚═══╝        ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │   /!\  THIS IS A DEVELOPMENT-ONLY TOOL — NEVER RUN IT ON PROD /!\ │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 *   IT EXECUTES ARBITRARY READ **AND WRITE** SQL AGAINST THE DATABASE FROM
 *   `src/config/database.ts`. THERE IS NO ALLOWLIST, NO READ-ONLY MODE AND NO
 *   CONFIRMATION STEP — A SINGLE CALL CAN `DROP`/`DELETE` THE ENTIRE DATABASE.
 *
 *   POINTING IT AT A PRODUCTION DATABASE IS EQUIVALENT TO HANDING AN AGENT
 *   UNAUDITED ROOT SQL ACCESS. KEEP IT ON A LOCAL/DEV DATABASE ONLY.
 *
 * ============================================================================
 *
 * Dev-only MCP server: run arbitrary SQL (read & write) against the project's
 * SQLite database from an MCP client (e.g. Claude Code). Registered in `.mcp.json`
 * and started with bare node (native TS type stripping, like `queue-runner.ts`):
 *
 *   node mcp/sql-server.ts
 *
 * The database path is taken from `src/config/database.ts` — the same config the
 * app uses — and resolved against the project root, so the server opens exactly
 * the same database the running app does, whatever the cwd is.
 *
 * Transport: newline-delimited JSON-RPC 2.0 over stdio (the MCP stdio framing).
 * Nothing but protocol messages may go to stdout — all logging goes to stderr.
 *
 * No external deps: `better-sqlite3` is already a project dependency and the
 * tiny MCP surface (initialize / tools/list / tools/call) is hand-rolled below.
 */

import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { databaseConfig } from '../src/config/database.ts';

const PROTOCOL_VERSION = '2024-11-05';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const log = (...args: unknown[]) => console.error('[sql-mcp]', ...args);

// ---- db ----------------------------------------------------------------------

let db: Database.Database | undefined;

/**
 * Lazily open (and memoize) the SQLite connection. Opening is deferred until the
 * first tool actually runs, so `tools/list` and `initialize` work even if the db
 * file is missing. better-sqlite3 would silently create an empty db at a wrong
 * path, so `fileMustExist` turns that into a tool error instead (see the catch
 * in `handle`).
 */
function getDb(): Database.Database {
  if(db !== undefined){
    return db;
  }

  const path = resolve(PROJECT_ROOT, databaseConfig.path);
  const sqlite = new Database(path, { fileMustExist: true });
  sqlite.pragma('foreign_keys = ON');
  db = sqlite;
  log(`opened database at ${path}`);

  return db;
}

// ---- tools -------------------------------------------------------------------
//
// Each tool is one entry in the `TOOLS` array below: { name, description,
// inputSchema, run }. The first three describe the tool to the MCP client
// (advertised verbatim by `tools/list`); `run` is the local implementation that
// actually does the work. `callTool` is the bridge — it looks a tool up by name
// and invokes its `run`. The functions just above `TOOLS` (runSql / execScript /
// listSchema) are those `run` handlers; defining them first keeps the array a
// flat, readable manifest.

// better-sqlite3 returns bigint for integers that don't fit in a JS number and
// for lastInsertRowid; JSON.stringify throws on bigint, so coerce it.
const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'bigint' ? value.toString() : value;

// The shape every tool's `run` must return: MCP wraps tool output in a `content`
// array of typed parts; here always a single pretty-printed JSON text block.
type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

/** Wrap any value as the single-text-block ToolResult the MCP client expects. */
function toResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, jsonReplacer, 2) }] };
}

/**
 * `run` handler for the `sql` tool: prepare and execute one statement.
 * better-sqlite3's `stmt.reader` tells us whether it yields rows — read
 * statements (SELECT/PRAGMA) return `{ rowCount, rows }`, writes/DDL return
 * `{ changes, lastInsertRowid }`. `args` is the raw, unvalidated `arguments`
 * object from the JSON-RPC call, so `sql`/`params` are type-checked here.
 */
function runSql(args: { sql?: unknown; params?: unknown }): ToolResult {
  const sql = args.sql;

  if(typeof sql !== 'string'){
    throw new Error('`sql` must be a string');
  }

  const stmt = getDb().prepare(sql);
  const params = normalizeParams(args.params);

  if(stmt.reader){
    const rows = params === undefined ? stmt.all() : stmt.all(params);
    return toResult({ rowCount: rows.length, rows });
  }

  const info = params === undefined ? stmt.run() : stmt.run(params);

  return toResult({ changes: info.changes, lastInsertRowid: info.lastInsertRowid });
}

/**
 * `run` handler for the `exec` tool: run a multi-statement script via
 * `db.exec` (no params, no rows returned). For migrations / batch DDL.
 */
function execScript(args: { sql?: unknown }): ToolResult {
  const sql = args.sql;

  if(typeof sql !== 'string'){
    throw new Error('`sql` must be a string');
  }

  getDb().exec(sql);

  return toResult({ ok: true });
}

/**
 * `run` handler for the `schema` tool: dump every user object (tables, indexes,
 * triggers, views) and its CREATE statement from `sqlite_master`. Takes no args.
 */
function listSchema(): ToolResult {
  const rows = getDb()
    .prepare(`SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name`)
    .all();

  return toResult({ objectCount: rows.length, objects: rows });
}

/**
 * Coerce the user-supplied `params` into what better-sqlite3 accepts: an array
 * (for `?` placeholders), an object (for `:named` params), or `undefined` (none).
 * Anything else throws so the model gets a clear binding-usage error.
 */
function normalizeParams(params: unknown): unknown[] | Record<string, unknown> | undefined {
  if(params === undefined || params === null){
    return undefined;
  }

  if(Array.isArray(params)){
    return params;
  }

  if(typeof params === 'object'){
    return params as Record<string, unknown>;
  }

  throw new Error('`params` must be an array (for ? placeholders) or an object (for named params)');
}

/**
 * The tool registry — the single source of truth for the server's capabilities.
 * Each entry couples the public contract (`name`, `description`, `inputSchema` —
 * what the client sees via `tools/list`) with the private `run` handler that
 * implements it. `tools/list` strips `run` and ships the rest; `tools/call`
 * routes by `name` through `callTool` to `run`. Add a tool = add one entry here;
 * no other code needs to change.
 */
const TOOLS = [
  {
    name: 'sql',
    description:
      'Execute a single SQL statement against the dev SQLite DB. SELECT/PRAGMA-style ' +
      'statements return their rows; INSERT/UPDATE/DELETE/DDL return { changes, lastInsertRowid }. ' +
      'Use `params` for safe value binding.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'A single SQL statement.' },
        params: {
          description: 'Bind values: an array for `?` placeholders, or an object for `:named` params.',
          type: ['array', 'object'],
        },
      },
      required: ['sql'],
    },
    run: runSql,
  },
  {
    name: 'exec',
    description:
      'Execute a multi-statement SQL script (statements separated by `;`). Returns no rows — ' +
      'use this for migrations / batch DDL. For a single statement or to read rows, use `sql`.',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'One or more SQL statements separated by semicolons.' },
      },
      required: ['sql'],
    },
    run: execScript,
  },
  {
    name: 'schema',
    description: 'List all tables, indexes, triggers and views with their CREATE statements (from sqlite_master).',
    inputSchema: { type: 'object', properties: {} },
    run: listSchema,
  },
] as const;

/**
 * Dispatch a `tools/call` to the matching entry's `run`. This is the only link
 * between the JSON-RPC layer and the tool implementations: it resolves `name` →
 * tool → `run(args)`. Unknown name throws; thrown errors (here or inside `run`)
 * are caught in `handle` and returned to the model as an `isError` result.
 */
function callTool(name: string, args: Record<string, unknown>): ToolResult {
  const tool = TOOLS.find(t => t.name === name);

  if(tool === undefined){
    throw new Error(`Unknown tool: ${name}`);
  }

  return tool.run(args);
}

// ---- JSON-RPC / MCP plumbing -------------------------------------------------
//
// The wire side. `main` reads newline-delimited JSON from stdin and feeds each
// message to `handle`, which implements the minimal MCP method set:
//   initialize   — handshake (protocol version + capabilities)
//   ping         — liveness
//   tools/list   — advertise TOOLS (name/description/inputSchema)
//   tools/call   — invoke a tool's `run` via callTool
// `send`/`reply`/`replyError` are the stdout JSON-RPC framing helpers.

type JsonRpcRequest = { jsonrpc: '2.0'; id?: number | string; method: string; params?: { name?: string; arguments?: Record<string, unknown> } };

/** Write one JSON-RPC message to stdout (newline-framed — the MCP stdio format). */
function send(message: object): void {
  process.stdout.write(JSON.stringify(message) + '\n');
}

/** Send a success response carrying `result` for the given request `id`. */
function reply(id: number | string, result: object): void {
  send({ jsonrpc: '2.0', id, result });
}

/** Send a JSON-RPC error response (used for unknown methods, etc.). */
function replyError(id: number | string, code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

/**
 * Route a single decoded JSON-RPC request to its handler and send the response.
 * Requests without an `id` are notifications — acknowledged by doing nothing.
 * `tools/call` failures are deliberately returned as a *successful* result with
 * `isError: true` so the model reads the SQL/error text, rather than as a
 * transport-level error that would abort the call.
 */
function handle(req: JsonRpcRequest): void {
  const { id, method, params } = req;

  // Notifications (no id) — nothing to answer.
  if(id === undefined){
    return;
  }

  if(method === 'initialize'){
    reply(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: 'sql-dev', version: '1.0.0' },
    });
    return;
  }

  if(method === 'ping'){
    reply(id, {});
    return;
  }

  if(method === 'tools/list'){
    reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    return;
  }

  if(method === 'tools/call'){
    const name = params?.name ?? '';
    const args = params?.arguments ?? {};

    try {
      reply(id, callTool(name, args));
    }
    catch (err){
      // Tool-level failures are reported as a successful result with isError,
      // so the model sees the SQL error text instead of a transport error.
      const text = err instanceof Error ? err.message : String(err);
      log(`tool "${name}" error:`, text);
      reply(id, { content: [{ type: 'text', text: `Error: ${text}` }], isError: true });
    }
    return;
  }

  replyError(id, -32601, `Method not found: ${method}`);
}

/**
 * Entry point: read stdin line-by-line as the JSON-RPC transport.
 * Each non-blank line is parsed and dispatched to `handle`; parse/handler errors
 * are logged to stderr (never stdout — stdout is reserved for protocol messages)
 * so one bad message can't take down the server.
 */
function main(): void {
  const rl = createInterface({ input: process.stdin });

  rl.on('line', line => {
    const trimmed = line.trim();

    if(trimmed === ''){
      return;
    }

    try {
      handle(JSON.parse(trimmed) as JsonRpcRequest);
    }
    catch (err){
      log('failed to handle message:', (err as Error).message);
    }
  });

  log('ready (stdio)');
}

main();
