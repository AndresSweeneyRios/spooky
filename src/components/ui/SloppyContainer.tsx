import { Slot } from "@radix-ui/react-slot";
import React from "react";

export function randomSeed(): number {
  return Math.floor(Math.random() * 5237895289012);
}

export type Seeder = () => number;
export function seeder(seed: number): Seeder {
  let value = seed;
  return () => {
    value = Math.sin(value++) * 10000;
    return value - Math.floor(value);
  };
}

export function limitedOffset(maxOffset: number, random: Seeder): number {
  return (random() - 0.5) * 2 * maxOffset;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface OffsetPoint {
  x: number;
  y: number;
}

export interface OffsetResult {
  offsetPoints: OffsetPoint[];
  controlPoints: OffsetPoint[];
  borderRadius: number;
}

export function generateOffsets(
  dimensions: Dimensions,
  _borderRadius: number,
  sloppiness: number,
  waviness: number,
  random: Seeder
): OffsetResult {
  const borderRadius = Math.min(
    _borderRadius,
    Math.min(dimensions.width, dimensions.height) * 0.5
  );

  const maxOffsetPoint = sloppiness;
  const maxOffsetControl = sloppiness * waviness;

  // Original points
  const points = [
    { x: borderRadius, y: 0 }, // pA
    { x: dimensions.width - borderRadius, y: 0 }, // pB
    { x: dimensions.width, y: borderRadius }, // pC
    { x: dimensions.width, y: dimensions.height - borderRadius }, // pD
    { x: dimensions.width - borderRadius, y: dimensions.height }, // pE
    { x: borderRadius, y: dimensions.height }, // pF
    { x: 0, y: dimensions.height - borderRadius }, // pG
    { x: 0, y: borderRadius }, // pH
  ];

  const applyOffset = (point: { x: number; y: number }, isCorner: boolean) => ({
    x: point.x + limitedOffset(isCorner ? 0 : maxOffsetPoint, random),
    y: point.y + limitedOffset(isCorner ? 0 : maxOffsetPoint, random),
  });

  const offsetPoints = points.map((pt, index) => {
    // corners are indices 0, 2, 4, 6
    const isCorner = index % 2 === 0;
    return applyOffset(pt, isCorner);
  });

  // control points for beziers along edges
  const controlPoints = [
    // top edge
    {
      x:
        (offsetPoints[0].x + offsetPoints[1].x) / 2 +
        limitedOffset(maxOffsetControl, random),
      y: offsetPoints[0].y - limitedOffset(maxOffsetControl, random),
    },
    // right edge
    {
      x: offsetPoints[2].x + limitedOffset(maxOffsetControl, random),
      y:
        (offsetPoints[2].y + offsetPoints[3].y) / 2 +
        limitedOffset(maxOffsetControl, random),
    },
    // bottom edge
    {
      x:
        (offsetPoints[4].x + offsetPoints[5].x) / 2 +
        limitedOffset(maxOffsetControl, random),
      y: offsetPoints[4].y + limitedOffset(maxOffsetControl, random),
    },
    // left edge
    {
      x: offsetPoints[6].x - limitedOffset(maxOffsetControl, random),
      y:
        (offsetPoints[6].y + offsetPoints[7].y) / 2 +
        limitedOffset(maxOffsetControl, random),
    },
  ];

  return { offsetPoints, controlPoints, borderRadius };
}

export function buildPathFromOffsets({
  offsetPoints,
  controlPoints,
  borderRadius,
}: OffsetResult): string {
  let path = "";

  // first point
  path += `M ${offsetPoints[0].x},${offsetPoints[0].y} `;

  // top edge
  path += `Q ${controlPoints[0].x},${controlPoints[0].y} ${offsetPoints[1].x},${offsetPoints[1].y} `;

  // top right corner bezier
  path += `C ${offsetPoints[1].x},${offsetPoints[1].y} ${
    offsetPoints[1].x + borderRadius
  },${offsetPoints[1].y} ${offsetPoints[2].x},${offsetPoints[2].y} `;

  // right edge
  path += `Q ${controlPoints[1].x},${controlPoints[1].y} ${offsetPoints[3].x},${offsetPoints[3].y} `;

  // bottom right corner bezier
  path += `C ${offsetPoints[3].x},${offsetPoints[3].y} ${offsetPoints[3].x},${
    offsetPoints[3].y + borderRadius
  } ${offsetPoints[4].x},${offsetPoints[4].y} `;

  // bottom edge
  path += `Q ${controlPoints[2].x},${controlPoints[2].y} ${offsetPoints[5].x},${offsetPoints[5].y} `;

  // bottom left corner bezier
  path += `C ${offsetPoints[5].x},${offsetPoints[5].y} ${
    offsetPoints[5].x - borderRadius
  },${offsetPoints[5].y} ${offsetPoints[6].x},${offsetPoints[6].y} `;

  // left edge
  path += `Q ${controlPoints[3].x},${controlPoints[3].y} ${offsetPoints[7].x},${offsetPoints[7].y} `;

  // top left corner bezier
  path += `C ${offsetPoints[7].x},${offsetPoints[7].y} ${offsetPoints[7].x},${
    offsetPoints[7].y - borderRadius
  } ${offsetPoints[0].x},${offsetPoints[0].y} `;

  path += "Z";

  return path;
}

export type SloppyContainerSizeMode =
  | "widthParentHeightChildren"
  | "parent"
  | "children";

export interface SloppyContainerProps {
  sloppiness?: number;
  waviness?: number;
  seed?: number;
  strokeWidth?: number;
  borderRadius?: number;
  offsetFactor?: number;
  bufferRoom?: number;
  sizeMode?: "widthParentHeightChildren" | "parent" | "children";
  className?: string;
  containerClassName?: string;
  asChild?: boolean;
}

export default function SloppyContainer({
  sloppiness = 4,
  seed = randomSeed(),
  waviness = 2.5,
  strokeWidth = 2.5,
  borderRadius = 0,
  offsetFactor = 0.1,
  sizeMode = "widthParentHeightChildren",
  containerClassName,
  className,
  asChild = false,
  children,
}: React.PropsWithChildren<SloppyContainerProps>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const childRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState<Dimensions>({
    width: -1,
    height: -1,
  });

  const updateDimensions = React.useCallback(() => {
    if (!containerRef.current || !childRef.current) return;
    let newWidth = 100;
    let newHeight = 100;

    if (sizeMode === "parent") {
      newWidth = containerRef.current.clientWidth;
      newHeight = containerRef.current.clientHeight;
    } else if (sizeMode === "children") {
      newWidth = childRef.current.scrollWidth;
      newHeight = childRef.current.scrollHeight;
    } else if (sizeMode === "widthParentHeightChildren") {
      newWidth = containerRef.current.clientWidth;
      newHeight = childRef.current.scrollHeight;
    }

    setDimensions({ width: newWidth, height: newHeight });
  }, [sizeMode]);

  React.useEffect(() => {
    let observer: ResizeObserver | null = null;

    updateDimensions();

    if (containerRef.current) {
      observer = new ResizeObserver(() => {
        updateDimensions();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    };
  }, [updateDimensions]);

  const random = React.useMemo(() => seeder(seed), [seed]);
  const randomOffset = React.useMemo(
    () => seeder(seed + offsetFactor),
    [seed, offsetFactor]
  );

  const [firstPass, secondPass] = React.useMemo(
    () =>
      [
        generateOffsets(dimensions, borderRadius, sloppiness, waviness, random),
        generateOffsets(
          dimensions,
          borderRadius,
          sloppiness,
          waviness,
          randomOffset
        ),
      ] as const,
    [dimensions, borderRadius, sloppiness, waviness, random, randomOffset]
  );

  const [firstPath, secondPath] = React.useMemo(
    () =>
      [
        buildPathFromOffsets(firstPass),
        buildPathFromOffsets(secondPass),
      ] as const,
    [firstPass, secondPass]
  );

  const [minViewWidth, minViewHeight, viewWidth, viewHeight] =
    React.useMemo(() => {
      const allPoints = [
        ...firstPass.offsetPoints,
        ...firstPass.controlPoints,
        ...secondPass.offsetPoints,
        ...secondPass.controlPoints,
      ];

      const xValues = allPoints.map((p) => p.x);
      const yValues = allPoints.map((p) => p.y);

      const minX = Math.min(...xValues) - strokeWidth / 2;
      const maxX = Math.max(...xValues) + strokeWidth / 2;
      const minY = Math.min(...yValues) - strokeWidth / 2;
      const maxY = Math.max(...yValues) + strokeWidth / 2;

      return [minX, minY, maxX - minX, maxY - minY] as const;
    }, [firstPass, secondPass]);

  const containerStyles = React.useMemo(() => {
    const styles: React.CSSProperties = {
      position: "relative",
      boxSizing: "border-box",
      overflow: "hidden",
    };

    if (sizeMode === "children") {
      styles.display = "inline-block";
      styles.width = "fit-content";
    } else if (sizeMode === "parent") {
      styles.width = "100%";
      styles.height = "100%";
    } else if (sizeMode === "widthParentHeightChildren") {
      styles.width = "100%";
    }

    return styles;
  }, [sizeMode]);

  const ChildComponent = React.useMemo(
    () => (asChild ? Slot : "div"),
    [asChild]
  );

  return (
    <div
      id="sloppy-container"
      ref={containerRef}
      style={{ ...containerStyles, opacity: dimensions.width > 0 ? 100 : 0 }}
      className={containerClassName}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${minViewWidth} ${minViewHeight} ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        <path
          d={firstPath}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={secondPath}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <ChildComponent
        ref={childRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        {children}
      </ChildComponent>
    </div>
  );
}
