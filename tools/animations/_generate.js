import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import fbx from "fbx2gltf"

const __dirname = import.meta.dirname;

const hierarchy = {};

const directories = readdirSync(join(__dirname), { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

directories.forEach(directory => {
  const files = readdirSync(join(__dirname, directory), { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name);

  files.forEach(file => {
    const filePath = join(__dirname, directory, file);
    const fileExtension = file.split('.').pop().toLowerCase();

    hierarchy[directory] = hierarchy[directory] || [];

    if (fileExtension === 'fbx') {
      const outputFilePath = filePath.replace('.fbx', '.glb');
      fbx(filePath, outputFilePath);
    }

    const fileNameWithExtension = file.split(/\\\\|\//g).pop().replace('.fbx', '.glb');

    if (hierarchy[directory].includes(fileNameWithExtension)) {
      return
    }

    hierarchy[directory].push(fileNameWithExtension);
  });
});

writeFileSync(join(__dirname, '../../public/3d/animations/_list.json'), JSON.stringify(hierarchy, null, 2));
