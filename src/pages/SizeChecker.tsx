import "./SizeChecker.css";
import React, { useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Hide splash element if it exists
const splash = document.getElementById("splash");
if (splash) {
  splash.setAttribute("is-hidden", "true");
}

// Binary size tree node structure
interface BinarySizeNode {
  name: string;
  size: number;
  percentage: number;
  children: BinarySizeNode[];
}

// WeakSets to track shared resources so we don't double count them.
let seenGeometries = new WeakSet<THREE.BufferGeometry>();
let seenMaterials = new WeakSet<THREE.Material>();
let seenTextures = new WeakSet<THREE.Texture>();

/**
 * Recursively calculates the binary size for a THREE.Object3D.
 * It sums up the sizes for geometries, materials, and textures,
 * while avoiding duplicate counts for shared resources.
 */
function calculateBinarySize(object: THREE.Object3D): BinarySizeNode {
  let ownSize = 0;
  const childrenNodes: BinarySizeNode[] = [];

  // Use object.name, or fallback to userData.name, or finally the object type.
  const nodeName = object.name || object.userData.name || object.type;

  // --- Geometry ---
  if ((object as THREE.Mesh).geometry) {
    const geometry = (object as THREE.Mesh).geometry;
    if (!seenGeometries.has(geometry)) {
      seenGeometries.add(geometry);
      // Sum sizes for each attribute
      for (const attrName in geometry.attributes) {
        const attribute = geometry.attributes[attrName];
        if (attribute.array) {
          ownSize += attribute.array.byteLength;
        }
      }
      // Include index buffer if available
      if (geometry.index && geometry.index.array) {
        ownSize += geometry.index.array.byteLength;
      }
    }
  }

  // --- Material ---
  if ((object as THREE.Mesh).material) {
    const material = (object as THREE.Mesh).material;
    if (Array.isArray(material)) {
      material.forEach((mat) => {
        if (!seenMaterials.has(mat)) {
          seenMaterials.add(mat);
          ownSize += estimateMaterialSize(mat);
        }
      });
    } else if (!seenMaterials.has(material)) {
      seenMaterials.add(material);
      ownSize += estimateMaterialSize(material);
    }
  }

  // Process children recursively and sum up their sizes
  let childrenTotalSize = 0;
  object.children.forEach((child) => {
    const childNode = calculateBinarySize(child);
    childrenNodes.push(childNode);
    childrenTotalSize += childNode.size;
  });

  // Total size for this node is its own size plus the size of its children.
  const totalSize = ownSize + childrenTotalSize;

  // Create the node for the current object.
  // If this node has both its own size and children, we create an extra child node
  // to represent the "direct" contribution of this node.
  const node: BinarySizeNode = {
    name: nodeName,
    size: totalSize,
    percentage: 0, // to be set later
    children: [],
  };

  // If there is a nonzero "direct" size and also children,
  // insert a special child node for the direct size.
  if (ownSize > 0 && childrenNodes.length > 0) {
    // Insert the direct contribution at the beginning for visibility.
    node.children.push({
      name: `${nodeName} (direct)`,
      size: ownSize,
      percentage: 0,
      children: [],
    });
  }

  // Append all computed children
  node.children.push(...childrenNodes);
  return node;
}

/**
 * Estimates the size of a material by adding a base size and
 * then estimating the size for each common texture map.
 */
function estimateMaterialSize(material: THREE.Material): number {
  let size = 1024; // Base overhead for material properties
  const standardMat = material as THREE.MeshStandardMaterial;

  const textureMaps = [
    standardMat.map,
    standardMat.normalMap,
    standardMat.roughnessMap,
    standardMat.metalnessMap,
    standardMat.aoMap,
    standardMat.emissiveMap,
  ];

  textureMaps.forEach((texture) => {
    if (texture && texture.image && !seenTextures.has(texture)) {
      seenTextures.add(texture);
      // Estimate size: width * height * 4 (assuming RGBA)
      const width = texture.image.width || 0;
      const height = texture.image.height || 0;
      size += width * height * 4;
    }
  });

  return size;
}

/**
 * Recursively calculates the percentage each node represents relative
 * to the total size.
 */
function calculatePercentages(node: BinarySizeNode, totalSize: number): void {
  node.percentage = (node.size / totalSize) * 100;
  node.children.forEach((child) => calculatePercentages(child, totalSize));
}

export const SizeChecker: React.FC = () => {
  const [sizeTree, setSizeTree] = useState<BinarySizeNode | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    // Reset the WeakSets for a fresh calculation.
    seenGeometries = new WeakSet<THREE.BufferGeometry>();
    seenMaterials = new WeakSet<THREE.Material>();
    seenTextures = new WeakSet<THREE.Texture>();

    const objectUrl = URL.createObjectURL(file);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      objectUrl,
      (gltf) => {
        // Calculate binary size tree
        const tree = calculateBinarySize(gltf.scene);
        // Compute percentages based on total size
        calculatePercentages(tree, tree.size);

        console.log("Binary Size Tree:", tree);
        setSizeTree(tree);
        setLoading(false);

        URL.revokeObjectURL(objectUrl);
        dracoLoader.dispose();
      },
      (progress) => {
        if (progress.total > 0) {
          console.log(`Loading: ${(progress.loaded / progress.total) * 100}%`);
        }
      },
      (error) => {
        console.error("Error loading GLB:", error);
        setLoading(false);
        URL.revokeObjectURL(objectUrl);
        dracoLoader.dispose();
      }
    );
  };

  // Helper: Format bytes into a human-readable string.
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  /**
   * Recursively renders the size node tree.
   * Children are sorted in descending order of their percentage.
   */
  const renderSizeNode = (
    node: BinarySizeNode,
    level = 0,
    isLast = true,
    prefix = ""
  ): JSX.Element => {
    // Sort children by percentage in descending order and filter out near-zero contributions.
    const sortedChildren = [...node.children]
      .sort((a, b) => b.percentage - a.percentage)
      .filter((child) => child.percentage > 1);

    return (
      <div key={`${node.name}-${level}`}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            {prefix}
            {level > 0 && (isLast ? "└─ " : "├─ ")}
            <span style={{ width: "80px", display: "inline-block" }}>
              {node.percentage.toFixed(2)}%
            </span>
            <span style={{ backgroundColor: "white", color: "black" }}>
              {node.name || "Unnamed"}
            </span>{" "}
            {formatBytes(node.size)}
          </span>
        </div>
        {sortedChildren.map((child, index) => {
          const childIsLast = index === sortedChildren.length - 1;
          const newPrefix =
            prefix + (level > 0 ? (isLast ? "   " : "│  ") : "");
          return renderSizeNode(child, level + 1, childIsLast, newPrefix);
        })}
      </div>
    );
  };

  return (
    <div id="size-checker">
      <div>
        <h1>GLB Size Checker (Binary Analysis)</h1>
        <form>
          <div>
            <label htmlFor="glbFile">Upload GLB file: </label>
            <input
              type="file"
              id="glbFile"
              accept=".glb"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </div>
        </form>
        {loading && <p>Loading and analyzing file...</p>}
        {sizeTree && (
          <div>
            <h2>Binary Size Analysis</h2>
            <p>Total Size: {formatBytes(sizeTree.size)}</p>
            <div className="size-tree">{renderSizeNode(sizeTree)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SizeChecker;
