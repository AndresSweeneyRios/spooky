import * as THREE from "three";

/**
 * Interface for tree node representing serialized size information
 */
export interface SizeTreeNode {
  name: string;
  size: number;
  percentage: number;
  children: SizeTreeNode[];
}

/**
 * Interface for queue items used in BFS traversal
 */
export interface QueueItem {
  object: THREE.Object3D;
  treeNode: SizeTreeNode;
}

/**
 * Computes a tree that represents the serialized file size of each node in a THREE.Object.
 * The size is measured as the length (in characters) of JSON.stringify(child.toJSON()),
 * and the percentage is relative to the size of the entire root object's serialization.
 *
 * @param {THREE.Object3D} root - A valid THREE.Object3D (or subclass) instance.
 * @returns {SizeTreeNode} A tree object with properties: name, size, percentage, and children.
 */
export function computeSerializedSizeTree(root: THREE.Object3D): SizeTreeNode {
  // Serialize the entire object and compute total size
  const totalJSON: string = JSON.stringify(root.toJSON());
  const totalSize: number = totalJSON.length;

  // Create the root tree node (using either the object's name or its type)
  const tree: SizeTreeNode = {
    name: root.name || root.type,
    size: totalSize,
    percentage: 100, // the root is 100% of the total
    children: [],
  };

  // Initialize the BFS queue. Each element contains:
  //   object: the THREE.Object3D node
  //   treeNode: the corresponding node in our size tree
  const queue: QueueItem[] = [{ object: root, treeNode: tree }];

  while (queue.length > 0) {
    const { object, treeNode } = queue.shift()!;

    // Process each child of the current object
    object.children.forEach((child) => {
      // Serialize the child object and compute its size
      const childJSON: string = JSON.stringify(child.toJSON());
      const childSize: number = childJSON.length;
      const percentage: number = (childSize / totalSize) * 100;

      // Build the tree node for the child
      const childTreeNode: SizeTreeNode = {
        name: child.name || child.type,
        size: childSize,
        percentage: percentage,
        children: [],
      };

      // Append the child's tree node to its parent's children list
      treeNode.children.push(childTreeNode);

      // Add the child node to the BFS queue for further processing
      queue.push({ object: child, treeNode: childTreeNode });
    });
  }

  return tree;
}

// ----- Example Usage ----- //

// Create a simple THREE.Object3D with children (this could be a Scene, Group, etc.)
const rootObject = new THREE.Object3D();
rootObject.name = "RootObject";

// Create some children and add them to the root
const child1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial()
);
child1.name = "Child1";
const child2 = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshBasicMaterial()
);
child2.name = "Child2";

// Add children to root
rootObject.add(child1);
rootObject.add(child2);

// Optionally add a grandchild
const grandchild = new THREE.Mesh(
  new THREE.ConeGeometry(0.5, 1, 8),
  new THREE.MeshBasicMaterial()
);
grandchild.name = "Grandchild";
child1.add(grandchild);

// Compute the size tree using BFS
const sizeTree = computeSerializedSizeTree(rootObject);

// Output the tree (for example, in the browser console)
console.log("Serialized Size Tree:", sizeTree);
