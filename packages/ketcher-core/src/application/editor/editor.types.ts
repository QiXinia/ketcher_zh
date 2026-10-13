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
import type { MonomerCreationState, Render } from 'application/render';
import type { Struct } from 'domain/entities/struct';
import type { selectionKeys } from './shared/constants';
import type { PipelineSubscription, Subscription } from 'subscription';
import type { IRnaPreset } from './tools/Tool';
import type { TextFormattingCommand } from './actions/textFormatting';
import type { ObjectAlignment, ObjectDistribution } from './actions/objectAlignment';
import type { RingFusionKind } from './actions/ringFusion';
import type { AtomSproutKind } from './actions/atomSprout';
import type { ChemicalHotspot, HotspotDirection } from './hotspot';
import type {
  NicknameDraft,
  NicknameDefinition,
} from 'domain/helpers/nicknames';

export type EditorSelection = {
  [key in typeof selectionKeys[number]]?: number[];
} & {
  enhancedFlags?: number[];
};
export type FloatingToolsParams = {
  visible?: boolean;
  rotateHandlePosition?: { x: number; y: number };
};

export enum EditorType {
  Micromolecules = 0,
  Macromolecules = 1,
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
  subscribe: (eventName: string, handler: (data?: any) => any) => any;
  unsubscribe: (eventName: string, subscriber: any) => void;
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
  setSelectedRingFillColor: (color?: string) => number;
  adjustSelectedAtomCharge: (delta: -1 | 1) => number;
  setSelectedAtomAttachmentPoint: () => number;
  fuseRingOnSelectedBond: (kind: RingFusionKind) => number;
  sproutOnSelectedAtom: (kind: AtomSproutKind) => number;
  captureAtomLabelSprout: () => { atomId: number; sourceKet: string };
  sproutAtomLabel: (label: string, draft: { atomId: number; sourceKet: string }) => number;
  captureAtomLabelEdit: () => { atomId: number; sourceKet: string; label: string };
  editAtomLabel: (label: string, draft: { atomId: number; sourceKet: string }) => number;
  getChemicalHotspot: () => ChemicalHotspot | null;
  selectChemicalHotspot: () => boolean;
  moveChemicalHotspot: (direction: HotspotDirection) => boolean;
  captureNicknameFragment: () => NicknameDraft;
  getNicknames: () => NicknameDefinition[];
  exportNicknameLibrary: () => string;
  importNicknameLibrary: (source: string) => number;
  prepareNicknamePreview: (ket: string) => string;
  saveNickname: (
    ket: string,
    name: string,
    attachmentAtomId: number,
  ) => NicknameDefinition;
  deleteNickname: (name: string) => void;
  activateNickname: (name: string) => void;
  clearRingFills: () => number;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  clearHistory: () => void;
  options: (value?: any) => any;
  setOptions: (opts: string) => any;
  zoom: (value?: any) => any;
  structSelected: () => Struct;
  explicitSelected: () => EditorSelection;
  centerStruct: () => void;
  zoomAccordingContent: (struct: Struct) => void;
  errorHandler: ((message: string) => void) | null;
  event: {
    message: Subscription;
    tooltip: Subscription;
    elementEdit: PipelineSubscription;
    bondEdit: PipelineSubscription;
    zoomIn: PipelineSubscription;
    zoomOut: PipelineSubscription;
    rgroupEdit: PipelineSubscription;
    sgroupEdit: PipelineSubscription;
    sdataEdit: PipelineSubscription;
    quickEdit: PipelineSubscription;
    attachEdit: PipelineSubscription;
    removeFG: PipelineSubscription;
    change: Subscription;
    selectionChange: PipelineSubscription;
    aromatizeStruct: PipelineSubscription;
    dearomatizeStruct: PipelineSubscription;
    enhancedStereoEdit: PipelineSubscription;
    confirm: PipelineSubscription;
    showInfo: PipelineSubscription;
    apiSettings: PipelineSubscription;
    cursor: Subscription;
    updateFloatingTools: Subscription<FloatingToolsParams>;
  };
  update: (
    action: Action | true,
    ignoreHistory?: boolean,
    options?: { resizeCanvas: boolean },
  ) => void;
  render: Render;
  // supposed to be RotateController from 'ketcher-react' package
  rotateController: any;
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
  item: IRnaPreset;
  position: {
    x: number;
    y: number;
  };
} | null;
