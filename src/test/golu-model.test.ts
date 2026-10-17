import { describe, expect, it } from "vitest";

import {
  createGoluObject,
  duplicateGoluObject,
  emptyGoluDesign,
  moveGoluObject,
  nextHistory,
  stagePositionStep,
  stageStepY,
  STAGE_OPTIONS,
  updateStageCount,
  type GoluAsset,
} from "@/lib/golu-model";

const ganesha: GoluAsset = {
  id: "ganesha",
  name: "Ganesha",
  category: "Gods & Goddesses",
  kind: "statue",
  src: "/ganesha.png",
};

describe("Golu design model", () => {
  it("offers the requested 3, 5, 7, and 9 step stages", () => {
    expect(STAGE_OPTIONS).toEqual([3, 5, 7, 9]);
  });

  it("maps the top and bottom of every step count to the correct stage level", () => {
    for (const steps of STAGE_OPTIONS) {
      expect(stagePositionStep(stageStepY(steps, steps), steps)).toBe(steps);
      expect(stagePositionStep(stageStepY(1, steps), steps)).toBe(1);
    }
  });

  it("keeps selected-step placements on the selected stage level", () => {
    expect(createGoluObject(ganesha, "object-1", 0, 3, 5).y).toBe(stageStepY(3, 5) - 17);
  });

  it("keeps each statue grounded when the stage size changes", () => {
    const design = emptyGoluDesign();
    const statue = createGoluObject(ganesha, "object-1", 0, 5, 5);
    const updated = updateStageCount({ ...design, objects: [statue] }, 3);
    expect(updated.objects[0]).toMatchObject({ step: 3, y: stageStepY(3, 3) - statue.height });
  });

  it("creates an empty five-step Golu as the starting design", () => {
    expect(emptyGoluDesign()).toEqual({
      name: "My Golu",
      steps: 5,
      warmLight: true,
      objects: [],
    });
  });

  it("preserves statue identity and places it on its chosen step", () => {
    expect(createGoluObject(ganesha, "object-1", 0, 3)).toMatchObject({
      id: "object-1",
      assetId: "ganesha",
      name: "Ganesha",
      step: 3,
      kind: "statue",
    });
  });

  it("duplicates an object without changing its source or stage", () => {
    const original = createGoluObject(ganesha, "object-1", 0, 1);
    const copy = duplicateGoluObject(original, "object-2");
    expect(copy.id).toBe("object-2");
    expect(copy.x).toBeGreaterThan(original.x);
    expect(original.id).toBe("object-1");
    expect(copy.y).toBe(original.y);
    expect(duplicateGoluObject({ ...original, x: 84 }, "object-3").x).toBe(84);
  });

  it("keeps moved objects within the canvas while accounting for their size", () => {
    const item = createGoluObject(ganesha, "object-1", 0, 1);
    expect(moveGoluObject(item, 99, 99, 1000, 600)).toMatchObject({ x: 94.6, y: 83 });
  });

  it("limits undo history to forty saved states", () => {
    expect(nextHistory(Array.from({ length: 40 }, (_, index) => index), 40)).toHaveLength(40);
    expect(nextHistory([1, 2], 3)).toEqual([1, 2, 3]);
  });
});