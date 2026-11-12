import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
async function withServer(options, fn) {
  const server = createApp(options).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
}
test("validates methods and input before generating", () =>
  withServer({}, async (url) => {
    assert.equal((await fetch(url + "/api/openAi")).status, 405);
    assert.equal(
      (
        await fetch(url + "/api/openAi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ situation: "" }),
        })
      ).status,
      400,
    );
  }));
test("missing configuration returns actionable error", () =>
  withServer({ apiKey: "" }, async (url) => {
    const response = await fetch(url + "/api/openAi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ situation: "My income has decreased." }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /OPENAI_API_KEY/);
  }));
test("passes Arabic instruction and returns generated result", () =>
  withServer(
    {
      generate: async (messages) => {
        assert.match(messages[0].content, /Arabic/);
        assert.match(messages[1].content, /Lost work/);
        return "  A factual statement.  ";
      },
    },
    async (url) => {
      const response = await fetch(url + "/api/openAi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: "Lost work", language: "ar" }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).text, "A factual statement.");
    },
  ));
test("does not leak provider errors", () =>
  withServer(
    {
      generate: async () => {
        throw Object.assign(new Error("secret-provider-detail"), {
          status: 429,
        });
      },
    },
    async (url) => {
      const response = await fetch(url + "/api/openAi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: "Lost work" }),
      });
      assert.equal(response.status, 429);
      assert.doesNotMatch(await response.text(), /secret-provider-detail/);
    },
  ));
