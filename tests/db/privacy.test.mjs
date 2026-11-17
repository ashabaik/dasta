// Privacy tests against the real database API.
// Seeded private fields carry markers (DSPRIV..). These tests read everything a visitor, a buyer and
// another seller can reach and fail if a marker shows up.
import { describe, it, expect, beforeAll } from "vitest";
import { anon, as, sql, env, sellerIdByCode, canariesExcept, findCanaries, BUYER_CANARIES } from "./helpers.mjs";

let tables = []; // every table and view in every non-system schema
let functions = []; // every function in public, app, private
let seller1Id;
let seller6Id;

beforeAll(async () => {
  tables = await sql(`
    select table_schema as schema, table_name as name
    from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema', 'pg_toast')
    order by 1, 2`);
  functions = await sql(`
    select n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app', 'private') and p.prokind = 'f'
    order by 1, 2`);
  seller1Id = await sellerIdByCode("S-7Q4X");
  seller6Id = await sellerIdByCode("S-W6PA");
});

/** Reads every table of every schema through the Data API with the given client. */
async function readEverything(client) {
  const out = [];
  for (const t of tables) {
    const { data, error } = await client.schema(t.schema).from(t.name).select("*").limit(1000);
    out.push({ ...t, rows: data ?? [], error: error?.code ?? null });
  }
  return out;
}

/** Calls every function with arguments an attacker would try: the id of seller 1. */
async function callEverything(client) {
  const out = [];
  for (const f of functions) {
    const names = f.args ? f.args.split(",").map((a) => a.trim().split(" ")[0]) : [];
    const guess = {};
    for (const n of names) {
      if (n.includes("seller_id")) guess[n] = seller1Id;
      else if (n === "p_reason") guess[n] = "trying to read private data";
      else if (n === "p_status") guess[n] = "active";
      else if (n === "p_verified") guess[n] = true;
      else if (n === "p_region") guess[n] = "cairo";
      else if (n === "p_len") guess[n] = 4;
      else guess[n] = "x";
    }
    const { data, error } = await client.schema(f.schema).rpc(f.name, guess);
    out.push({ ...f, data: data ?? null, error: error?.code ?? error?.message ?? null });
  }
  return out;
}

const viewers = [
  { label: "a visitor who is not signed in", client: () => Promise.resolve(anon()), own: [] },
  { label: "a buyer", client: () => as("buyer1"), own: [] },
  { label: "another seller", client: () => as("seller2"), own: [2] },
  { label: "a seller who is not approved yet", client: () => as("seller6"), own: [6] },
];

describe.each(viewers)("private data is unreachable for $label", ({ client, own }) => {
  let c;
  beforeAll(async () => {
    c = await client();
  });

  it("no table or view in any schema returns a private marker", async () => {
    const results = await readEverything(c);
    expect(results.length).toBeGreaterThan(20);
    const leaks = results
      .map((r) => ({ table: `${r.schema}.${r.name}`, found: findCanaries(r.rows, [...canariesExcept(own), ...BUYER_CANARIES]) }))
      .filter((r) => r.found.length);
    expect(leaks).toEqual([]);
  });

  it("the private schema cannot be queried at all", async () => {
    const results = (await readEverything(c)).filter((r) => r.schema === "private");
    expect(results.length).toBeGreaterThanOrEqual(7);
    for (const r of results) {
      expect(r.error, `private.${r.name} must be refused`).not.toBeNull();
      expect(r.rows).toEqual([]);
    }
  });

  it("only the public schema answers through the Data API", async () => {
    const answered = new Set((await readEverything(c)).filter((r) => r.error === null).map((r) => r.schema));
    expect([...answered]).toEqual(["public"]);
  });

  it("no function returns a private marker, whatever it is called with", async () => {
    const results = await callEverything(c);
    expect(results.length).toBeGreaterThanOrEqual(10);
    const leaks = results
      .map((r) => ({ fn: `${r.schema}.${r.name}`, found: findCanaries(r.data, [...canariesExcept(own), ...BUYER_CANARIES]) }))
      .filter((r) => r.found.length);
    expect(leaks).toEqual([]);
  });

  it("the admin reveal function refuses and leaves no audit row", async () => {
    const before = (await sql("select count(*)::int n from private.identity_reveals"))[0].n;
    const { data, error } = await c.rpc("admin_reveal_seller_identity", { p_seller_id: seller1Id, p_reason: "curious about this seller" });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
    expect((await sql("select count(*)::int n from private.identity_reveals"))[0].n).toBe(before);
  });

  it("the GraphQL endpoint does not know the private tables", async () => {
    const token = (await c.auth.getSession()).data.session?.access_token ?? env.publishableKey;
    const res = await fetch(`${env.supabaseUrl}/graphql/v1`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: env.publishableKey, authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: "{ __schema { types { name fields { name } } } }" }),
    });
    const text = await res.text();
    for (const word of ["seller_identities", "sellerIdentities", "legal_name", "legalName", "iban", "identity_reveals", "user_roles"]) {
      expect(text.includes(word), `GraphQL schema mentions ${word}`).toBe(false);
    }
  });

  it("the auth admin API refuses a normal session", async () => {
    const token = (await c.auth.getSession()).data.session?.access_token ?? env.publishableKey;
    const res = await fetch(`${env.supabaseUrl}/auth/v1/admin/users`, {
      headers: { apikey: env.publishableKey, authorization: `Bearer ${token}` },
    });
    expect([401, 403]).toContain(res.status);
    expect(findCanaries(await res.text(), [...canariesExcept([]), ...BUYER_CANARIES])).toEqual([]);
  });

  it("products of a seller who is not approved stay hidden (unless they are your own)", async () => {
    const { data } = await c.from("products").select("part_number, seller_id").eq("seller_id", seller6Id);
    if (own.includes(6)) expect(data.length).toBe(2);
    else expect(data).toEqual([]);
  });
});

describe("control: the scanner does find markers where they really are", () => {
  it("finds every seller's markers when it is given the private table", async () => {
    const rows = await sql("select * from private.seller_identities");
    const found = findCanaries(rows, canariesExcept([]));
    expect(rows).toHaveLength(6);
    for (const n of ["01", "02", "03", "04", "05", "06"]) expect(found).toContain(`DSPRIV${n}`);
  });

  it("finds a phone number even when it is written with other separators", () => {
    expect(findCanaries({ note: "call +20-000-000-0103 now" }, canariesExcept([]))).toContain("000 000 0103");
  });
});

describe("the public seller row has no link to a person", () => {
  it("sellers has exactly the public columns", async () => {
    const cols = (await sql("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'sellers' order by 1")).map((r) => r.column_name);
    expect(cols).toEqual(["code", "id", "joined_month", "rating_avg", "rating_count", "region", "status", "verified"]);
  });

  it("a seller's public id is not their account id", async () => {
    const rows = await sql("select count(*)::int n from public.sellers s join auth.users u on u.id = s.id");
    expect(rows[0].n).toBe(0);
  });

  it("anon and authenticated have no privilege on any private table or on the schema", async () => {
    const rows = await sql(`
      select r.rolname, has_schema_privilege(r.rolname, 'private', 'usage') as usage,
        (select count(*)::int from information_schema.table_privileges tp where tp.table_schema = 'private' and tp.grantee = r.rolname) as grants
      from pg_roles r where r.rolname in ('anon', 'authenticated')`);
    for (const r of rows) {
      expect(r.usage, `${r.rolname} usage on private`).toBe(false);
      expect(r.grants, `${r.rolname} grants in private`).toBe(0);
    }
  });

  it("every public table has row level security switched on", async () => {
    const rows = await sql("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
    expect(rows).toEqual([]);
  });

  it("no function is callable by PUBLIC or anon unless it is on the allow-list", async () => {
    const rows = await sql(`
      select n.nspname || '.' || p.proname as fn
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')
      order by 1`);
    expect(rows.map((r) => r.fn)).toEqual([]);
  });
});

describe("a seller and their own data", () => {
  it("a seller can read their own identity and only theirs", async () => {
    const c = await as("seller2");
    const { data, error } = await c.rpc("seller_my_identity");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].legal_name).toContain("DSPRIV02NAME");
    expect(findCanaries(data, canariesExcept([2]))).toEqual([]);
  });

  it("a buyer gets nothing from the seller identity function", async () => {
    const c = await as("buyer1");
    const { data } = await c.rpc("seller_my_identity");
    expect(data ?? []).toEqual([]);
  });

  it("a buyer sees their own buyer row and no other buyer", async () => {
    const c = await as("buyer1");
    const { data } = await c.from("buyers").select("code");
    expect(data.map((r) => r.code)).toEqual(["B-4K7PD"]);
  });

  it("whoami reports the role from the database, not from the client", async () => {
    const seller = await (await as("seller1")).rpc("whoami");
    expect(seller.data[0]).toMatchObject({ role: "seller", seller_code: "S-7Q4X", buyer_code: null });
    const buyer = await (await as("buyer1")).rpc("whoami");
    expect(buyer.data[0]).toMatchObject({ role: "buyer", buyer_code: "B-4K7PD", seller_code: null });
  });
});

describe("the admin and the audit log", () => {
  it("the admin cannot read the identity table directly", async () => {
    const c = await as("admin");
    const { data, error } = await c.schema("private").from("seller_identities").select("*");
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("a reveal needs a reason", async () => {
    const c = await as("admin");
    const { error } = await c.rpc("admin_reveal_seller_identity", { p_seller_id: seller1Id, p_reason: "short" });
    expect(error?.message).toContain("reason_required");
  });

  it("a reveal returns the identity and writes exactly one audit row first", async () => {
    const c = await as("admin");
    const before = (await sql("select count(*)::int n from private.identity_reveals"))[0].n;
    const { data, error } = await c.rpc("admin_reveal_seller_identity", { p_seller_id: seller1Id, p_reason: "Dispute on a sample order, need to call the seller" });
    expect(error).toBeNull();
    expect(data[0].legal_name).toContain("DSPRIV01NAME");
    const rows = await sql("select seller_id, reason from private.identity_reveals order by id desc limit 1");
    expect((await sql("select count(*)::int n from private.identity_reveals"))[0].n).toBe(before + 1);
    expect(rows[0].seller_id).toBe(seller1Id);
    expect(rows[0].reason).toContain("Dispute on a sample order");
    const list = await c.rpc("admin_list_reveals");
    expect(list.data[0]).toMatchObject({ seller_code: "S-7Q4X" });
  });

  it("signing up cannot make an admin", async () => {
    const { service } = await import("./helpers.mjs");
    const s = service();
    const email = `sneaky-${Date.now()}@dasta.example`;
    const { data, error } = await s.auth.admin.createUser({ email, password: env.demoPassword, email_confirm: true, user_metadata: { role: "admin" } });
    expect(error).toBeNull();
    const rows = await sql("select role from private.user_roles where user_id = $1", [data.user.id]);
    expect(rows[0].role).toBe("buyer");
    await s.auth.admin.deleteUser(data.user.id);
  });
});
