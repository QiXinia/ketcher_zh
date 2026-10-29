/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import type { Action } from './actions/action';
import type {
  MonomerCreationState,
  Render,
  RenderOptions,
} from 'application/render';
import type { Struct } from 'domain/entities/struct';
import type { AtomAttributes } from 'domain/entities/atom';
import type { Bond } from 'domain/entities/bond';
import type { RGroupAttributes } from 'domain/entities/rgroup';
import type { selectionKeys } from './shared/constants';
import type { PipelineSubscription, Subscription } from 'subscription';
import type { IRnaPreset } from './tools/Tool';
import type { TextFormattingCommand } from './actions/textFormatting';
import type { ObjectAlignment, ObjectDistribution } from './actions/objectAlignment';
import type {
  MonomerOrAmbiguousType,
  AttachmentPointName,
  MonomerItemType,
} from 'domain/types';
import type { BaseMonomer } from 'domain/entities/BaseMonomer';
import type { LayoutMode } from 'application/editor/modes/types';
import type { PolymerBond } from 'domain/entities/PolymerBond';

export type MonomerCreationWizardRequest = {
  mode: 'create' | 'instance' | 'all' | 'library' | 'duplicate';
  monomer?: BaseMonomer;
  libraryItem?: MonomerItemType;
};

export type CreateBondViaModalPayload = {
  firstMonomer: BaseMonomer;
  secondMonomer: BaseMonomer;
  firstSelectedAttachmentPoint: AttachmentPointName;
  secondSelectedAttachmentPoint: AttachmentPointName;
  polymerBond?: PolymerBond;
  isReconnection?: boolean;
  initialFirstMonomerAttachmentPoint?: AttachmentPointName;
  initialSecondMonomerAttachmentPoint?: AttachmentPointName;
};

export type SelectLayoutModePayload =
  | LayoutMode
  | { mode: LayoutMode; mergeWithLatestHistoryCommand: boolean };

export type EditMonomerVariant = 'single' | 'identical' | 'non-identical';

export interface EditMonomerPayload {
  fgIds: number[];
  variant: EditMonomerVariant;
}

export type EditorSelection = Partial<
  Record<(typeof selectionKeys)[number], number[]>
> & {
  enhancedFlags?: number[];
};
export type FloatingToolsParams = {
  visible?: boolean;
  rotateHandlePosition?: { x: number; y: number };
};

export type EditorOptions = Partial<
  RenderOptions & {
    viewOnlyMode: boolean;
  }
>;

export enum EditorType {
  Micromolecules = 0,
  Macromolecules = 1,
}

export type EditorSubscriber<T = unknown> = {
  handler: (data?: T) => void;
};

export interface RotateController {
  isRotating: boolean;
  rerender: () => void;
  revert: () => void;
  clean: () => void;
  updateFloatingToolsPosition: () => void;
}

export interface Editor {
  isDitrty: () => boolean;
  setOrigin: () => void;
  struct: (
    struct?: Struct,
    needToCenterStruct?: boolean,
    x?: number,
    y?: number,
  ) => Struct;
  structToAddFragment: (struct: Struct, x?: number, y?: number) => Struct;
  subscribe: <T = unknown>(
    eventName: string,
    handler: (data?: T) => void,
  ) => EditorSubscriber<T>;
  unsubscribe: <T = unknown>(
    eventName: string,
    subscriber: EditorSubscriber<T>,
  ) => void;
  selection: (arg?: EditorSelection | 'all' | null) => EditorSelection | null;
  formatSelectedTexts: (command: TextFormattingCommand, value?: string | number) => number;
  flattenSelectedObjects: () => number;
  centerSelectedObjects: () => number;
  joinSelectedObjects: () => number;
  alignSelectedObjects: (alignment: ObjectAlignment) => number;
  distributeSelectedObjects: (direction: ObjectDistribution) => number;
  setSelectedSimpleObjectStyle: (style: 'plain' | 'dashed' | 'bold') => number;
  setSelectedSimpleObjectColor: (color?: string) => number;
  setSelectedSimpleObjectArrow: (
    endpoint: 'start' | 'end',
    arrow: 'none' | 'full' | 'half-left' | 'half-right',
  ) => number;
  setSelectedSimpleObjectCurveProperty: (
    property: 'doubled' | 'closed' | 'fill' | 'faded',
    value: boolean | 'none' | 'solid' | 'shaded',
  ) => number;
  setSelectedSimpleObjectBracketType: (bracketType: 'bracket' | 'parenthesis' | 'brace') => number;
  undo: () => void;
  redo: () => void;
  historyStack: Action[];
  historyPtr: number;
  addHistoryAction: (action: Action) => void;
  clear: () => void;
  clearHistory: () => void;
  options(): RenderOptions;
  options(value: EditorOptions): void;
  setOptions: (opts: string) => void;
  zoom: (value?: number) => number | undefined;
  structSelected: () => Struct;
  explicitSelected: () => EditorSelection;
  centerStruct: () => void;
  zoomAccordingContent: (struct: Struct) => void;
  errorHandler: ((message: string) => void) | null;
  event: {
    message: Subscription<{ info?: string | false; error?: unknown }>;
    tooltip: Subscription<{ message: string } | undefined>;
    elementEdit: PipelineSubscription<unknown, Promise<Partial<AtomAttributes> & { content?: string }>>;
    bondEdit: PipelineSubscription<Bond[], Promise<Bond>>;
    zoomIn: PipelineSubscription;
    zoomOut: PipelineSubscription;
    rgroupEdit: PipelineSubscription<unknown, Promise<RGroupAttributes & { label?: number }>>;
    sgroupEdit: PipelineSubscription<unknown, Promise<{ type?: string; attrs: { context?: string; expanded?: boolean; [key: string]: unknown } }>>;
    sdataEdit: PipelineSubscription;
    quickEdit: PipelineSubscription;
    attachEdit: PipelineSubscription;
    removeFG: PipelineSubscription<{ fgIds: number[] }, Promise<unknown>>;
    editMonomer: PipelineSubscription;
    change: Subscription;
    selectionChange: PipelineSubscription;
    aromatizeStruct: PipelineSubscription;
    dearomatizeStruct: PipelineSubscription;
    enhancedStereoEdit: PipelineSubscription<{ stereoLabel: string | null | undefined }, Promise<string | null>>;
    confirm: PipelineSubscription;
    showInfo: PipelineSubscription;
    apiSettings: PipelineSubscription;
    cursor: Subscription<{ status: 'enable'; cursorPosition: { clientX: number; clientY: number } } | { status: 'move' | 'mouseover' | 'leave' | 'disable' }>;
    updateFloatingTools: Subscription<FloatingToolsParams>;
  };
  update: (
    action: Action | true,
    ignoreHistory?: boolean,
    options?: { resizeCanvas: boolean },
  ) => void;
  render: Render;
  rotateController: RotateController;
  macromoleculeConvertionError: string | null | undefined;
  setMacromoleculeConvertionError: (errorMessage: string) => void;
  clearMacromoleculeConvertionError: () => void;
  serverSettings: object;
  focusCliparea: () => void;
  closeMonomerCreationWizard: () => void;
  ketcherId: string;
  isMonomerCreationWizardActive: boolean;
  monomerCreationState: MonomerCreationState;
}

export type LibraryItemDragState = {
  item: IRnaPreset | MonomerOrAmbiguousType;
  position: {
    x: number;
    y: number;
  };
} | null;

/**
 * Identifies a specific free attachment point on a monomer.
 * Used to track drag-over hover targets during library-item drag operations.
 */
export type AttachmentPointTarget = {
  monomer: BaseMonomer;
  attachmentPointName: AttachmentPointName;
};
