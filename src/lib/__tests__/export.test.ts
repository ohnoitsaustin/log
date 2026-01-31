import { describe, it, expect } from "vitest";
import { parseImportJSON } from "../export";

describe("parseImportJSON", () => {
  it("parses valid JSON array with all fields", () => {
    const json = JSON.stringify([
      { body: "Hello world", mood: 4, tags: ["work", "life"] },
      { body: "Second entry", mood: 2, tags: [] },
    ]);

    const result = parseImportJSON(json);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ body: "Hello world", mood: 4, tags: ["work", "life"] });
    expect(result[1]).toEqual({ body: "Second entry", mood: 2, tags: [] });
  });

  it("handles entries with only body (mood and tags optional)", () => {
    const json = JSON.stringify([{ body: "Just text" }]);

    const result = parseImportJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ body: "Just text", mood: null, tags: [] });
  });

  it("filters out non-string tags", () => {
    const json = JSON.stringify([{ body: "Test", tags: ["valid", 123, null, "also-valid"] }]);

    const result = parseImportJSON(json);

    expect(result[0].tags).toEqual(["valid", "also-valid"]);
  });

  it("throws on non-array input", () => {
    expect(() => parseImportJSON('{"body": "not an array"}')).toThrow("Expected a JSON array");
  });

  it("throws on entry missing body", () => {
    const json = JSON.stringify([{ mood: 3, tags: ["test"] }]);

    expect(() => parseImportJSON(json)).toThrow('missing a "body" field');
  });

  it("throws on empty body", () => {
    const json = JSON.stringify([{ body: "   " }]);

    expect(() => parseImportJSON(json)).toThrow('missing a "body" field');
  });

  it("throws on non-object entry", () => {
    const json = JSON.stringify(["just a string"]);

    expect(() => parseImportJSON(json)).toThrow("is not an object");
  });

  it("handles invalid JSON", () => {
    expect(() => parseImportJSON("not json at all")).toThrow();
  });
});
