import "./SizeChecker.css";
import React, { useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const splash = document.getElementById('splash');
if (splash) {
  splash.setAttribute('is-hidden', 'true');
}

// Binary size tree node structure
interface BinarySizeNode {
  name: string;
  size: number;
  percentage: number;
  children: BinarySizeNode[];
}


// Add this at the top of your file after the interface
let seenGeometries = new WeakSet<THREE.BufferGeometry>();
let seenMaterials = new WeakSet<THREE.Material>();
let seenTextures = new WeakSet<THREE.Texture>();

// Modify the calculateBinarySize function
function calculateBinarySize(object: THREE.Object3D): BinarySizeNode {
  let totalSize = 0;
  const children: BinarySizeNode[] = [];
  
  // Process current object
  let objectSize = 0;
  
  // Calculate geometry size if exists
  if ((object as THREE.Mesh).geometry) {
    const geometry = (object as THREE.Mesh).geometry;
    if (!seenGeometries.has(geometry)) {
      seenGeometries.add(geometry);
      for (const name in geometry.attributes) {
        const attribute = geometry.attributes[name];
        if (attribute.array) {
          objectSize += attribute.array.byteLength;
        }
      }
      
      // Add index buffer size if exists
      if (geometry.index && geometry.index.array) {
        objectSize += geometry.index.array.byteLength;
      }
    }
  }
  
  // Calculate material size if exists
  if ((object as THREE.Mesh).material) {
    const material = (object as THREE.Mesh).material;
    // Add estimated size for material (textures are the heaviest part)
    if (Array.isArray(material)) {
      material.forEach(mat => {
        if (!seenMaterials.has(mat)) {
          seenMaterials.add(mat);
          objectSize += estimateMaterialSize(mat);
        }
      });
    } else if (!seenMaterials.has(material)) {
      seenMaterials.add(material);
      objectSize += estimateMaterialSize(material);
    }
  }
  
  // Process children recursively
  object.children.forEach(child => {
    const childSizeNode = calculateBinarySize(child);
    totalSize += childSizeNode.size;
    children.push(childSizeNode);
  });
  
  // Add current object size to total
  totalSize += objectSize;
  
  // Return size node
  return {
    name: object.userData.name || object.type,
    size: totalSize,
    percentage: 0, // Will be calculated later
    children
  };
}

// Update estimateMaterialSize function to track textures
function estimateMaterialSize(material: THREE.Material): number {
  let size = 1024; // Base size for material properties
  
  const standardMaterial = material as THREE.MeshStandardMaterial;
  
  // Check for common texture maps
  const textures = [
    standardMaterial.map,
    standardMaterial.normalMap,
    standardMaterial.roughnessMap,
    standardMaterial.metalnessMap,
    standardMaterial.aoMap,
    standardMaterial.emissiveMap
  ];
  
  textures.forEach(texture => {
    if (texture && texture.image && !seenTextures.has(texture)) {
      seenTextures.add(texture);
      // Estimate texture size based on dimensions and format
      const width = texture.image.width || 0;
      const height = texture.image.height || 0;
      // Rough estimate: 4 bytes per pixel for RGBA
      size += width * height * 4;
    }
  });
  
  return size;
}

// Calculate percentages
function calculatePercentages(node: BinarySizeNode, totalSize: number): void {
  node.percentage = (node.size / totalSize) * 100;
  node.children.forEach(child => calculatePercentages(child, totalSize));
}

export const SizeChecker: React.FC = () => {
  const [sizeTree, setSizeTree] = useState<BinarySizeNode | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    setLoading(true);
    
    // Reset the WeakSets to track shared resources
    seenGeometries = new WeakSet<THREE.BufferGeometry>();
    seenMaterials = new WeakSet<THREE.Material>();
    seenTextures = new WeakSet<THREE.Texture>();

    const objectUrl = URL.createObjectURL(file);
    
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    loader.load(
      objectUrl,
      (gltf) => {
        // Calculate binary size tree
        const sizeTreeRaw = calculateBinarySize(gltf.scene);
        console.log(gltf.scene)
        // Calculate percentages
        calculatePercentages(sizeTreeRaw, sizeTreeRaw.size);
        
        console.log("Binary Size Tree:", sizeTreeRaw);
        
        setSizeTree(sizeTreeRaw);
        setLoading(false);
        
        URL.revokeObjectURL(objectUrl);
        dracoLoader.dispose();
      },
      (progress) => {
        console.log(`Loading: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error("Error loading GLB:", error);
        setLoading(false);
        URL.revokeObjectURL(objectUrl);
        dracoLoader.dispose();
      }
    );
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render tree node with ASCII characters
  const renderSizeNode = (node: BinarySizeNode, level = 0, isLast = true, prefix = ""): JSX.Element => {
    // Sort children by percentage in descending order
    const sortedChildren = [...node.children]
      .sort((a, b) => b.percentage - a.percentage)
      .filter(child => child.percentage > 1);
    
    return (
      <div key={`${node.name}-${level}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            {prefix}
            {level > 0 ? (isLast ? "└─ " : "├─ ") : ""}
            <span style={{ width: '80px', display: 'inline-block' }}>{node.percentage.toFixed(2)}%</span>
            <span style={{ backgroundColor: 'white', color: 'black' }}>{node.name || 'Unnamed'}</span><> </>
            {formatBytes(node.size)}
          </span>
        </div>
        {sortedChildren.map((child, index) => {
          const isChildLast = index === sortedChildren.length - 1;
          const newPrefix = prefix + (level > 0 ? (isLast ? "   " : "│  ") : "");
          return renderSizeNode(child, level + 1, isChildLast, newPrefix);
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
            <div className="size-tree">
              {renderSizeNode(sizeTree)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SizeChecker;
