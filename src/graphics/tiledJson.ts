export interface Map {
  compressionlevel: number;
  height: number;
  infinite: boolean;
  layers: Layer[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tileheight: number;
  tilesets: Tileset[];
  tilewidth: number;
  type: string;
  version: string;
  width: number;
}

export interface Layer {
  chunks: Chunk[];
  height: number;
  id: number;
  name: string;
  opacity: number;
  startx: number;
  starty: number;
  type: string;
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

export interface Chunk {
  data: number[];
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface Tileset {
  firstgid: number;
  source: string;
}

export enum TileType {
  None = 0,
  Water = 1,
  Sand = 2,
  Trail = 3,
  Grass = 4,
  Height1 = 30,
  Height2 = 31,
  Height3 = 32,
  Height4 = 33,
  Spawn = 34,
  Plot = 35,
}

export const getHeight = (type: TileType) => {
  switch (type) {
    case TileType.Height1:
      return 3
    case TileType.Height2:
      return 6
    case TileType.Height3:
      return 9
    case TileType.Height4:
      return 12
    default:
      return 0
  }
}

export const PLOT_SIZE = 16
