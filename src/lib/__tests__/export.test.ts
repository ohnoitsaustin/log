import { describe, it, expect } from "vitest";
import { parseImportJSON } from "../export";

describe("parseImportJSON", () => {
  it("parses valid JSON array with all fields", () => {
    const json = JSON.stringify([
      {
        body: "Hello world",
        mood: 4,
        energy: 3,
        location: "Portland, Oregon",
        weather: { high: 62, low: 45, emoji: "☀️", description: "clear sky" },
        tags: ["work", "life"],
        activities: ["running"],
      },
      { body: "Second entry", mood: 2, tags: [], activities: [] },
    ]);

    const result = parseImportJSON(json);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      body: "Hello world",
      mood: 4,
      energy: 3,
      location: "Portland, Oregon",
      weather: { high: 62, low: 45, emoji: "☀️", description: "clear sky" },
      tags: ["work", "life"],
      activities: ["running"],
    });
    expect(result[1]).toEqual({
      body: "Second entry",
      mood: 2,
      energy: null,
      location: "",
      weather: null,
      tags: [],
      activities: [],
    });
  });

  it("handles entries with only body (all other fields optional)", () => {
    const json = JSON.stringify([{ body: "Just text" }]);

    const result = parseImportJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      body: "Just text",
      mood: null,
      energy: null,
      location: "",
      weather: null,
      tags: [],
      activities: [],
    });
  });

  it("parses weather object correctly", () => {
    const weather = { high: 75, low: 60, emoji: "🌧️", description: "light rain" };
    const json = JSON.stringify([{ body: "Rainy day", weather }]);

    const result = parseImportJSON(json);

    expect(result[0].weather).toEqual(weather);
  });

  it("ignores string weather (legacy format)", () => {
    const json = JSON.stringify([{ body: "Old entry", weather: "sunny" }]);

    const result = parseImportJSON(json);

    expect(result[0].weather).toBeNull();
  });

  it("parses energy as number", () => {
    const json = JSON.stringify([{ body: "Energetic", energy: 5 }]);

    const result = parseImportJSON(json);

    expect(result[0].energy).toBe(5);
  });

  it("ignores non-number energy", () => {
    const json = JSON.stringify([{ body: "Test", energy: "high" }]);

    const result = parseImportJSON(json);

    expect(result[0].energy).toBeNull();
  });

  it("parses location as string", () => {
    const json = JSON.stringify([{ body: "Test", location: "New York, NY" }]);

    const result = parseImportJSON(json);

    expect(result[0].location).toBe("New York, NY");
  });

  it("filters out non-string tags", () => {
    const json = JSON.stringify([{ body: "Test", tags: ["valid", 123, null, "also-valid"] }]);

    const result = parseImportJSON(json);

    expect(result[0].tags).toEqual(["valid", "also-valid"]);
  });

  it("filters out non-string activities", () => {
    const json = JSON.stringify([{ body: "Test", activities: ["valid", 123, null, "also-valid"] }]);

    const result = parseImportJSON(json);

    expect(result[0].activities).toEqual(["valid", "also-valid"]);
  });

  it("throws on non-array input", () => {
    expect(() => parseImportJSON('{"body": "not an array"}')).toThrow("Expected a JSON array");
  });

  it("throws on entry missing body", () => {
    const json = JSON.stringify([{ mood: 3, tags: ["test"], activities: [] }]);

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
