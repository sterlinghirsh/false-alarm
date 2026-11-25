import { parsePhrases, listProblem, loadLists, saveList, deleteList, listText } from "../savedLists";

test("a paste becomes phrases: trimmed, blank lines and repeats dropped", () => {
  expect(parsePhrases("  One \r\n\n one\nTwo  words\n\n")).toEqual(["One", "Two words"]);
});

test("listProblem matches the server's limits", () => {
  expect(listProblem("", ["a"])).toMatch(/name/);
  expect(listProblem("x".repeat(25), ["a"])).toMatch(/24/);
  expect(listProblem("ok", [])).toMatch(/at least one/);
  expect(listProblem("ok", ["y".repeat(41)])).toMatch(/40/);
  expect(listProblem("ok", Array.from({ length: 101 }, (_, i) => `${i}`))).toMatch(/100/);
  expect(listProblem("ok", ["fine"])).toBeNull();
});

test("lists save, survive a reload of storage, and delete", () => {
  localStorage.clear();
  saveList({ id: "l1", name: "Mine", phrases: ["a", "b"] });
  saveList({ id: "l1", name: "Renamed", phrases: ["a"] });
  expect(loadLists()).toEqual([{ id: "l1", name: "Renamed", phrases: ["a"] }]);
  expect(listText(loadLists()[0])).toBe("a");
  expect(deleteList("l1")).toEqual([]);
  localStorage.setItem("falseAlarm.lists", "{not json");
  expect(loadLists()).toEqual([]);
});
