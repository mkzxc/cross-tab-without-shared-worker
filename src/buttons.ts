async function simpleTest() {
  console.group("SQLite OPFS Simple Tests");

  console.log("Test INSERT");
  await fetch("/__db__/exec", {
    method: "POST",
    body: JSON.stringify({
      sql: "INSERT INTO messages (content, created_at) VALUES (?,?)",
      bind: ["Hello from tab!", Date.now()],
    }),
  });

  // if (!response.ok) {
  //   const error = await res.json();
  //   console.error("[Test] exec failed:", error);
  //   return;
  // }

  console.log("Test QUERY");
  const res = await fetch("/__db__/query", {
    method: "POST",
    body: JSON.stringify({
      sql: "SELECT * FROM messages ORDER BY id DESC LIMIT 5",
    }),
  });
  const { rows } = await res.json();
  console.log("QUERY RES", rows);

  console.log("Test CONCURRENT WRITES");
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      fetch("/__db__/exec", {
        method: "POST",
        body: JSON.stringify({
          sql: "INSERT INTO messages (content, created_at) VALUES (?,?)",
          bind: [`concurrent-${i}`, Date.now()],
        }),
      }),
    ),
  );
  const res2 = await fetch("/__db__/query", {
    method: "POST",
    body: JSON.stringify({ sql: "SELECT COUNT(*) as count FROM messages" }),
  });
  const { rows: countRows } = await res2.json();
  console.log("Total rows", countRows[0].count);

  console.groupEnd();
}

async function concurrencyTest() {
  console.group("SQLite OPFS Concurrency Tests");

  const TAB_ID = Math.random().toString(36).slice(2, 6);
  const WRITES = 10;

  // So you don't have to be Bolt to test this
  for (let i = 3; i > 0; i--) {
    console.log(`Starting in ${i}...`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`Tab ${TAB_ID}`);

  const start = performance.now();

  const results = await Promise.all(
    Array.from({ length: WRITES }, (_, i) =>
      fetch("/__db__/exec", {
        method: "POST",
        body: JSON.stringify({
          sql: "INSERT INTO messages (content, created_at) VALUES (?,?)",
          bind: [`tab-${TAB_ID}-write-${i}`, Date.now()],
        }),
      }).then((r) => r.json()),
    ),
  );

  const elapsed = (performance.now() - start).toFixed(0);
  const success = results.every((r) => r.success);
  console.log(`All writes done in ${elapsed}ms, success: ${success} `);

  const res = await fetch("/__db__/query", {
    method: "POST",
    body: JSON.stringify({ sql: "SELECT COUNT(*) as count FROM messages" }),
  });
  const { rows } = await res.json();
  console.log(`Row count: ${rows[0].count}`);

  const res2 = await fetch("/__db__/query", {
    method: "POST",
    body: JSON.stringify({ sql: "SELECT content FROM messages ORDER BY id" }),
  });
  const { rows: allRows } = await res2.json();
  //TODO I don't care about it right now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents = allRows.map((r: any) => r.content);
  const unique = new Set(contents);
  const areThereDuplicates = unique.size !== contents.length;
  console.log(`Duplicates: ${areThereDuplicates}`);
  console.log(`Rows:`, contents);

  console.groupEnd();
}

function setupButtons() {
  const simple = document.getElementById(
    "simple-test",
  ) as HTMLButtonElement | null;
  const concurrency = document.getElementById(
    "concurrency-test",
  ) as HTMLButtonElement | null;

  if (!simple || !concurrency) return;

  simple.disabled = false;
  concurrency.disabled = false;

  simple.addEventListener("click", simpleTest);
  concurrency.addEventListener("click", concurrencyTest);
}

export { setupButtons };
