/**
 * @File   : types.ts
 * @Author : dtysky (dtysky@outlook.com)
 * @Link   : dtysky.moe
 * @Date   : 2022/9/20 23:32:25
 */
export interface IBookIndex {
  id: string | number;
  label: string;
  children: IBookIndex[];
}

export enum ENotesAction {
  Add,
  Update,
  Delete
}

export interface IViewerCommonProps {
  content: ArrayBuffer;
  index?: IBookIndex;
  progress: number;
  onLoad(indexes: IBookIndex[], start: number, max: number): void;
  onProgress?(progress: number): void;
  // checkMark(pos: string | number): [pos];
  // requestMark(pos: string | number, len: number): number;
}
