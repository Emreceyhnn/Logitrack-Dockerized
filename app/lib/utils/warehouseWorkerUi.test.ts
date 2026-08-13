import { describe, it } from "node:test";
import { expect } from "expect";
import {
  sortTasksByPriority,
  pickNextTask,
  zoneCapacityAdvice,
} from "./warehouseWorkerUi";
import type { Task, Priority, Zone } from "../type/warehouseWorkerClient";

function task(
  id: string,
  priority: Priority,
  done: number,
  total: number
): Task {
  return { id, kind: "PICK", name: id, order: id, zone: "A", done, total, priority };
}

describe("warehouseWorkerUi task ordering", () => {
  describe("sortTasksByPriority()", () => {
    it("should_OrderOpenBeforeCompleted_ThenHighToLow", () => {
      const tasks: Task[] = [
        task("done-high", "high", 5, 5), // completed
        task("open-low", "low", 0, 3),
        task("open-high", "high", 1, 4),
        task("open-med", "med", 2, 6),
      ];

      const ids = sortTasksByPriority(tasks).map((t) => t.id);
      // Open high → open med → open low → completed (last).
      expect(ids).toEqual(["open-high", "open-med", "open-low", "done-high"]);
    });

    it("should_BeStableWithinAPriorityTier", () => {
      const tasks: Task[] = [
        task("high-1", "high", 0, 2),
        task("high-2", "high", 0, 2),
        task("high-3", "high", 0, 2),
      ];
      // Equal priority + equal open-state → server order preserved.
      expect(sortTasksByPriority(tasks).map((t) => t.id)).toEqual([
        "high-1",
        "high-2",
        "high-3",
      ]);
    });

    it("should_NotMutateTheInputArray", () => {
      const tasks: Task[] = [task("b", "low", 0, 1), task("a", "high", 0, 1)];
      const before = tasks.map((t) => t.id);
      sortTasksByPriority(tasks);
      expect(tasks.map((t) => t.id)).toEqual(before);
    });
  });

  describe("pickNextTask()", () => {
    it("should_ReturnTheTopOpenTask", () => {
      const sorted = sortTasksByPriority([
        task("open-high", "high", 0, 3),
        task("open-low", "low", 0, 3),
      ]);
      expect(pickNextTask(sorted)?.id).toBe("open-high");
    });

    it("should_SkipCompletedTasks", () => {
      // Highest priority is done → next task is the next OPEN one.
      const sorted = sortTasksByPriority([
        task("done-high", "high", 4, 4),
        task("open-med", "med", 0, 4),
      ]);
      expect(pickNextTask(sorted)?.id).toBe("open-med");
    });

    it("should_ReturnNull_WhenNothingIsOpen", () => {
      const sorted = sortTasksByPriority([
        task("done-1", "high", 2, 2),
        task("done-2", "low", 1, 1),
      ]);
      expect(pickNextTask(sorted)).toBeNull();
    });
  });
});

const zone = (name: string, pct: number): Zone => ({ name, pct });

describe("zoneCapacityAdvice()", () => {
  it("should_ReturnEmpty_WhenNothingIsCritical", () => {
    expect(zoneCapacityAdvice([zone("A", 40), zone("B", 84)])).toEqual([]);
  });

  it("should_FlagCriticalZone_AndSuggestEmptiestHealthyAlternative", () => {
    const advice = zoneCapacityAdvice([
      zone("A", 90),
      zone("B", 60),
      zone("C", 30),
    ]);
    expect(advice.length).toBe(1);
    expect(advice[0]?.zone).toBe("A");
    // C (30%) is emptier than B (60%) → preferred divert target.
    expect(advice[0]?.alternative?.name).toBe("C");
  });

  it("should_OrderCriticalZones_FullestFirst", () => {
    const advice = zoneCapacityAdvice([
      zone("A", 88),
      zone("B", 95),
      zone("C", 20),
    ]);
    expect(advice.map((a) => a.zone)).toEqual(["B", "A"]);
  });

  it("should_GiveNoAlternative_WhenNoZoneIsBelowWarning", () => {
    // Every zone at/above the 70% warning line → nowhere safe to divert.
    const advice = zoneCapacityAdvice([zone("A", 90), zone("B", 72)]);
    expect(advice[0]?.alternative).toBeNull();
  });

  it("should_NotDivertBetweenCriticalZones", () => {
    // Two full zones, no healthy one → neither is a valid divert target.
    const advice = zoneCapacityAdvice([zone("A", 90), zone("B", 88)]);
    expect(advice.every((a) => a.alternative === null)).toBe(true);
  });
});
