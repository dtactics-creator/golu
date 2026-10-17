export const STAGE_OPTIONS = [3, 5, 7, 9] as const;

export type GoluStageCount = (typeof STAGE_OPTIONS)[number];
export type GoluObjectKind = "statue" | "decoration";

export type GoluAsset = {
  id: string;
  name: string;
  category: string;
  kind: GoluObjectKind;
  src: string;
};

export type GoluObject = {
  id: string;
  assetId: string;
  name: string;
  category: string;
  kind: GoluObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: number;
  step: number;
};

export type GoluDesign = {
  name: string;
  steps: GoluStageCount;
  warmLight: boolean;
  objects: GoluObject[];
};

export function emptyGoluDesign(): GoluDesign {
  return { name: "My Golu", steps: 5, warmLight: true, objects: [] };
}

const STAGE_SURFACE_Y: Record<GoluStageCount, readonly number[]> = {
  3: [49, 62, 73],
  5: [30, 41, 52, 64, 76],
  7: [23, 31, 40, 49, 58, 67, 76],
  9: [17, 25, 33, 41, 49, 57, 65, 73, 81],
};

export function stageStepY(step: number, steps: GoluStageCount): number {
  const boundedStep = Math.max(1, Math.min(steps, step));
  return STAGE_SURFACE_Y[steps][steps - boundedStep] ?? 52;
}

export function stagePositionStep(y: number, steps: GoluStageCount): number {
  return STAGE_SURFACE_Y[steps]
    .map((surface, index) => ({ step: steps - index, distance: Math.abs(surface - y) }))
    .reduce((closest, candidate) => candidate.distance < closest.distance ? candidate : closest).step;
}

export function updateStageCount(design: GoluDesign, steps: GoluStageCount): GoluDesign {
  return {
    ...design,
    steps,
    objects: design.objects.map((item) => {
      const step = Math.max(1, Math.min(steps, item.step));
      return { ...item, step, y: stageStepY(step, steps) - item.height };
    }),
  };
}

export function createGoluObject(
  asset: GoluAsset,
  id: string,
  index: number,
  step: number,
  steps: GoluStageCount = 5,
): GoluObject {
  return {
    id,
    assetId: asset.id,
    name: asset.name,
    category: asset.category,
    kind: asset.kind,
    x: Math.max(28, Math.min(70, 33 + (index % 4) * 10)),
    y: stageStepY(step, steps) - (asset.kind === "statue" ? 17 : 17),
    width: asset.kind === "statue" ? 9 : 12,
    height: asset.kind === "statue" ? 17 : 17,
    rotation: 0,
    layer: index,
    step,
  };
}

export function duplicateGoluObject(item: GoluObject, id: string): GoluObject {
  return {
    ...item,
    id,
    x: Math.min(84, item.x + 4),
    y: item.y,
    layer: item.layer + 1,
  };
}

export function moveGoluObject(
  item: GoluObject,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
): GoluObject {
  const maxX = Math.max(0, 100 - (item.width * canvasHeight) / canvasWidth);
  const maxY = Math.max(0, 100 - item.height);
  return {
    ...item,
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}

export function nextHistory<T>(history: T[], current: T, limit = 40): T[] {
  return [...history.slice(-(limit - 1)), current];
}