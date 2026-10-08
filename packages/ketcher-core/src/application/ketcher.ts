import { Subscription } from 'subscription';
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

import { saveAs } from 'file-saver';
import {
  type FormatterFactory,
  identifyStructFormat,
  SupportedFormat,
} from './formatters';
import type {
  GenerateImageOptions,
  StructService,
  CalculateData,
  CalculateResult,
} from 'domain/services';

import {
  type Editor,
  getSelectionFromStruct,
  MonomerLibraryConvertError,
} from './editor';

import { provideEditorInstance } from './editor/editorSingleton';
import { Indigo } from 'application/indigo';
import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import type { MolfileFormat } from 'domain/serializers/mol/mol.types';
import { SGroup } from 'domain/entities/sgroup';
import { Struct } from 'domain/entities/struct';
import assert from 'assert';
import {
  EventEmitter,
  type LogSettings,
  LogLevel,
  runAsyncAction,
  SettingsManager,
  getSvgFromDrawnStructures,
  KetcherLogger,
  ensureString,
} from 'utilities';
import { ketcherProvider } from './ketcherProvider';
import {
  deleteAllEntitiesOnCanvas,
  parseAndAddMacromoleculesOnCanvas,
  prepareStructToRender,
} from './utils';
import { fromTextCreation } from './editor/actions';
import { Vec2 } from 'domain/entities/vec2';
import { type EditorSelection, EditorType } from './editor/editor.types';
import {
  type ExportImageParams,
  type SupportedImageFormats,
  type SupportedModes,
  type UpdateMonomersLibraryParams,
  BlobTypes,
  ModeTypes,
} from 'application/ketcher.types';
import { isNumber, uniqueId } from 'lodash';
import { ChemicalMimeType } from 'domain/services/struct/structService.types';
import { SequenceType } from 'domain/entities/monomer-chains/types';
import type { ISettingsService, Settings } from 'application/settings';
import { getStructure } from 'application/getStructure';

type SetMoleculeOptions = {
  position?: { x: number; y: number };
  needZoom?: boolean;
  preserveCanvasPosition?: boolean;
};

type AddTextOptions = {
  width?: number;
  height?: number;
};

const allowedApiSettings = {
  'general.dearomatize-on-load': 'dearomatize-on-load',
  ignoreChiralFlag: 'ignoreChiralFlag',
  disableQueryElements: 'disableQueryElements',
  bondThickness: 'bondThickness',
};

const MONOMER_LIBRARY_FORMAT_OPTIONS = {
  inputFormat: ChemicalMimeType.MonomerLibrary,
  outputFormat: ChemicalMimeType.MonomerLibrary,
  outputContentType: ChemicalMimeType.MonomerLibrary,
} as const;

export class Ketcher {
  _id: string;
  logging: LogSettings;
  structService: StructService;
  readonly #formatterFactory: FormatterFactory;
  #editor: Editor | null = null;
  _indigo: Indigo;
  readonly #eventBus: EventEmitter;
  readonly #settingsService?: ISettingsService;
  changeEvent: Subscription;
  libraryUpdateEvent: Subscription;

  get editor(): Editor {
    // we should assign editor exactly after ketcher creation
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    return this.#editor!;
  }

  get eventBus(): EventEmitter {
    return this.#eventBus;
  }

  /**
   * Get settings service for managing application settings
   * Returns undefined if settings service was not provided during construction
   */
  get settingsService(): ISettingsService | undefined {
    return this.#settingsService;
  }

  constructor(
    structService: StructService,
    formatterFactory: FormatterFactory,
    settingsService?: ISettingsService,
  ) {
    assert(structService != null);
    assert(formatterFactory != null);
    this._id = uniqueId();
    this.changeEvent = new Subscription();
    this.libraryUpdateEvent = new Subscription();
    this.structService = structService;
    this.#formatterFactory = formatterFactory;
    this.#settingsService = settingsService;
    this._indigo = new Indigo(this.structService);
    this.#eventBus = new EventEmitter();
    this.logging = {
      enabled: false,
      level: LogLevel.ERROR,
      showTrace: false,
    };

    // Subscribe to settings changes if settings service is provided
    if (this.#settingsService) {
      this.#settingsService.subscribe((newSettings) => {
        this.#onSettingsChanged(newSettings);
      });
    }
  }

  /**
   * Handle settings changes from settings service
   * Updates editor and triggers re-render if needed
   */
  #onSettingsChanged(settings: Settings): void {
    // This will be called when settings change
    // The editor will need to be updated with new settings
    // For now, this is a placeholder for Phase 2 integration
    KetcherLogger.info('Settings changed', settings);
  }

  get id() {
    return this._id;
  }

  get formatterFactory() {
    return this.#formatterFactory;
  }

  get indigo() {
    return this._indigo;
  }

  // TEMP.: getting only dearomatize-on-load setting
  get settings() {
    const options = this.editor.options();
    const result = Object.entries(allowedApiSettings).reduce(
      (acc, [apiSetting, clientSetting]) => {
        if (clientSetting in options) {
          return { ...acc, [apiSetting]: clientSetting };
        }
        return acc;
      },
      {},
    );

    if (!Object.keys(result).length) {
      throw new Error('Allowed options are not provided');
    }

    return result;
  }

  addEditor(editor: Editor) {
    this.#editor = editor;
  }

  // TODO: create options type
  setSettings(settings: Record<string, string | boolean>) {
    // TODO: need to expand this and refactor this method
    if (!settings) {
      throw new Error('Please provide settings');
    }
    const options = {};
    for (const [apiSetting, clientSetting] of Object.entries(
      allowedApiSettings,
    )) {
      options[clientSetting] = settings[apiSetting];
    }

    if (Object.hasOwn(settings, 'disableCustomQuery')) {
      SettingsManager.disableCustomQuery = !!settings.disableCustomQuery;
    }

    if (Object.hasOwn(settings, 'persistMonomerLibraryUpdates')) {
      SettingsManager.persistMonomerLibraryUpdates =
        !!settings.persistMonomerLibraryUpdates;
    }

    return this.editor.setOptions(JSON.stringify(options));
  }

  getSmiles(isExtended = false): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('SMILES format is not available in macro mode');
    }
    const format = isExtended
      ? SupportedFormat.smilesExt
      : SupportedFormat.smiles;
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format,
    );
  }

  getExtendedSmiles(): Promise<string> {
    return this.getSmiles(true);
  }

  async getMolfile(molfileFormat?: MolfileFormat): Promise<string> {
    if (this.containsReaction()) {
      throw Error(
        'The structure cannot be saved as *.MOL due to reaction arrows.',
      );
    }

    const formatPassed =
      molfileFormat === 'v3000'
        ? SupportedFormat.molV3000
        : SupportedFormat.mol;
    const format = molfileFormat ? formatPassed : SupportedFormat.molAuto;

    const molfile = await getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format,
      provideEditorInstance()?.drawingEntitiesManager,
    );

    return molfile;
  }

  getIdt(): Promise<string> {
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.idt,
      provideEditorInstance()?.drawingEntitiesManager,
    );
  }

  getAxoLabs(): Promise<string> {
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.axoLabs,
      provideEditorInstance()?.drawingEntitiesManager,
    );
  }

  async getRxn(molfileFormat: MolfileFormat = 'v2000'): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('RXN format is not available in macro mode');
    }
    if (!this.containsReaction()) {
      throw Error(
        'The structure cannot be saved as *.RXN: there is no reaction arrows.',
      );
    }
    const format =
      molfileFormat === 'v3000'
        ? SupportedFormat.rxnV3000
        : SupportedFormat.rxn;
    const rxnfile = await getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format,
    );

    return rxnfile;
  }

  getKet(): Promise<string> {
    return getStructure(
      this.id,
      this.#formatterFactory,
      (provideEditorInstance()?._type ?? EditorType.Micromolecules) ===
        EditorType.Micromolecules
        ? this.editor.struct()
        : provideEditorInstance()?.drawingEntitiesManager.micromoleculesHiddenEntities?.clone(),
      SupportedFormat.ket,
      (provideEditorInstance()?._type ?? EditorType.Micromolecules) ===
        EditorType.Micromolecules
        ? undefined
        : provideEditorInstance()?.drawingEntitiesManager,
      this.editor.selection() as EditorSelection,
    );
  }

  /**
   * Add a Lexical text object through the editor action pipeline.
   *
   * The public setKet API is useful for document replacement, but it clears
   * the editor history.  Reaction conditions and component numbers are small
   * drawing edits, so expose the same operation that the native text tool
   * uses and let Editor.update() record it for undo/redo.
   */
  addText(
    content: string,
    position: { x: number; y: number },
    options: AddTextOptions = {},
  ): number {
    if (
      !content ||
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      throw new Error('Text content and position are required');
    }
    const width =
      Number.isFinite(options.width) && (options.width as number) > 0
        ? (options.width as number)
        : 2;
    const height =
      Number.isFinite(options.height) && (options.height as number) > 0
        ? (options.height as number)
        : 0.7;
    const topLeft = new Vec2(position.x, position.y);
    const pos = [
      topLeft,
      new Vec2(position.x, position.y + height),
      new Vec2(position.x + width, position.y + height),
      new Vec2(position.x + width, position.y),
    ];
    const action = fromTextCreation(
      this.editor.render.ctab,
      content,
      topLeft,
      pos,
    );
    this.editor.update(action);
    const ids = [...this.editor.struct().texts.keys()];
    return ids[ids.length - 1] ?? -1;
  }

  getFasta(): Promise<string> {
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.fasta,
      provideEditorInstance()?.drawingEntitiesManager,
    );
  }

  async getHelm(): Promise<string> {
    return (
      await this.indigo.convert(await this.getKet(), {
        outputFormat: ChemicalMimeType.HELM,
      })
    ).struct;
  }

  async getSequence(
    format: '1-letter' | '3-letter' = '1-letter',
  ): Promise<string> {
    if (format === '1-letter' || format === '3-letter') {
      const editor = provideEditorInstance();
      const indigo = this.indigo;

      const ketSerializer = new KetSerializer();
      const serializedKet = ketSerializer.serialize(
        editor.drawingEntitiesManager.micromoleculesHiddenEntities.clone(),
        editor.drawingEntitiesManager,
      );

      const formatToUse =
        format === '1-letter'
          ? ChemicalMimeType.SEQUENCE
          : ChemicalMimeType.PeptideSequenceThreeLetter;

      try {
        const result = await indigo.convert(serializedKet, {
          outputFormat: formatToUse,
        });
        return result.struct;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(
          `Failed to convert structure to ${format} format: ${errorMessage}`,
        );
      }
    }

    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format === '3-letter'
        ? SupportedFormat.sequence3Letter
        : SupportedFormat.sequence,
      provideEditorInstance()?.drawingEntitiesManager,
    );
  }

  getSmarts(): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('SMARTS format is not available in macro mode');
    }
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.smarts,
    );
  }

  getCml(): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('CML format is not available in macro mode');
    }
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.cml,
    );
  }

  getSdf(molfileFormat: MolfileFormat = 'v2000'): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('SDF format is not available in macro mode');
    }
    const format =
      molfileFormat === 'v2000'
        ? SupportedFormat.sdf
        : SupportedFormat.sdfV3000;
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format,
    );
  }

  getRdf(molfileFormat: MolfileFormat = 'v2000'): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('RDF format is not available in macro mode');
    }
    const format =
      molfileFormat === 'v2000'
        ? SupportedFormat.rdf
        : SupportedFormat.rdfV3000;
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      format,
    );
  }

  getCDXml(): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('CDXML format is not available in macro mode');
    }
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.cdxml,
    );
  }

  getCDX(): Promise<string> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('CDX format is not available in macro mode');
    }
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.cdx,
    );
  }

  getInchi(withAuxInfo = false): Promise<string> {
    return getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      withAuxInfo ? SupportedFormat.inChIAuxInfo : SupportedFormat.inChI,
    );
  }

  async getInChIKey(): Promise<string> {
    const struct: string = await getStructure(
      this.id,
      this.#formatterFactory,
      this.editor.struct(),
      SupportedFormat.ket,
    );

    return this.structService.getInChIKey(struct);
  }

  containsReaction(): boolean {
    const editor = provideEditorInstance();
    return (
      this.editor.struct().hasRxnArrow() ||
      editor?.drawingEntitiesManager?.micromoleculesHiddenEntities.hasRxnArrow()
    );
  }

  isQueryStructureSelected(): boolean {
    const structure = this.editor.struct();
    const selection = this.editor.selection();

    if (!selection) {
      return false;
    }

    let hasQueryAtoms = false;
    if (selection.atoms) {
      hasQueryAtoms = selection.atoms.some((atomId) => {
        const atom = structure.atoms.get(atomId);
        assert(atom);
        const sGroupIds = Array.from(atom.sgs.values());
        const isQueryComponentSGroup = sGroupIds.some((sGroupId) => {
          const sGroup = structure.sgroups.get(sGroupId);
          assert(sGroup);
          return SGroup.isQuerySGroup(sGroup);
        });
        return atom.isQuery() || isQueryComponentSGroup;
      });
    }

    let hasQueryBonds = false;
    if (selection.bonds) {
      hasQueryBonds = selection.bonds.some((bondId) => {
        const bond = structure.bonds.get(bondId);
        assert(bond);
        return bond.isQuery();
      });
    }
    return hasQueryAtoms || hasQueryBonds;
  }

  async setMolecule(
    structStr: string,
    options?: SetMoleculeOptions,
  ): Promise<void | undefined> {
    const macromoleculesEditor = provideEditorInstance();
    if (macromoleculesEditor?.isSequenceEditInRNABuilderMode) {
      throw new Error(
        'Finish RNA Builder sequence editing before replacing the document',
      );
    }

    await runAsyncAction<void>(
      async () => {
        assert(typeof structStr === 'string');

        if (window.isPolymerEditorTurnedOn) {
          await parseAndAddMacromoleculesOnCanvas(
            structStr,
            this.structService,
            false,
            true,
          );

          if (options?.needZoom !== false) {
            macromoleculesEditor?.zoomToStructuresIfNeeded();
            macromoleculesEditor.mode.initialize();
          }
        } else {
          const struct: Struct = await prepareStructToRender(
            structStr,
            this.structService,
            this,
          );

          const preserveCanvasPosition =
            options?.preserveCanvasPosition === true;

          if (!preserveCanvasPosition) {
            struct.rescale();
          }

          const { x, y } = options?.position ?? {};

          // System coordinates for browser and for chemistry files format (mol, ket, etc.) area are different.
          // It needs to rotate them by 180 degrees in y-axis.
          this.editor.struct(struct, false, x, isNumber(y) ? -y : y);

          // Restore selection from initiallySelected flags in the loaded structure
          this.editor.selection(getSelectionFromStruct(this.editor.struct()));
          // Clean up initiallySelected flags after restoring selection
          this.editor.struct().disableInitiallySelected();

          if (!preserveCanvasPosition) {
            this.editor.zoomAccordingContent(struct);
          }
          if (x == null && y == null && !preserveCanvasPosition) {
            this.editor.centerStruct();
          }
        }
      },
      this.eventBus,
      true,
    );
  }

  async setHelm(helmStr: string): Promise<void | undefined> {
    assert(typeof helmStr === 'string');
    // HELM is not SMILES, even when represented by a single line. Explicit
    // conversion also supplies the standalone editor's monomer library.
    const result = await this.indigo.convert(helmStr, {
      inputFormat: ChemicalMimeType.HELM,
      outputFormat: ChemicalMimeType.KET,
    });
    await this.setMolecule(result.struct, { needZoom: true });
  }

  async setFasta(
    fastaStr: string,
    sequenceType: 'PEPTIDE' | 'RNA' | 'DNA' = 'PEPTIDE',
  ): Promise<void> {
    assert(typeof fastaStr === 'string');
    if (!Object.values(SequenceType).includes(sequenceType as SequenceType)) {
      throw new Error('FASTA sequence type must be PEPTIDE, RNA or DNA');
    }
    const fastaInputFormat = {
      PEPTIDE: ChemicalMimeType.PEPTIDE_FASTA,
      RNA: ChemicalMimeType.RNA_FASTA,
      DNA: ChemicalMimeType.DNA_FASTA,
    }[sequenceType];
    const result = await this.indigo.convert(fastaStr, {
      inputFormat: fastaInputFormat,
      outputFormat: ChemicalMimeType.KET,
    });
    await this.setMolecule(result.struct, { needZoom: true });
  }

  async addFragment(
    structStr: string,
    options?: SetMoleculeOptions,
  ): Promise<void | undefined> {
    const macromoleculesEditor = provideEditorInstance();

    if (macromoleculesEditor?.isSequenceEditInRNABuilderMode) return;

    await runAsyncAction<void>(async () => {
      assert(typeof structStr === 'string');

      if (window.isPolymerEditorTurnedOn) {
        const isCanvasEmptyBeforeOpenStructure =
          !macromoleculesEditor.drawingEntitiesManager.hasDrawingEntities;

        await parseAndAddMacromoleculesOnCanvas(structStr, this.structService);

        if (isCanvasEmptyBeforeOpenStructure) {
          macromoleculesEditor?.zoomToStructuresIfNeeded();
        }
      } else {
        const struct: Struct = await prepareStructToRender(
          structStr,
          this.structService,
          this,
        );

        struct.rescale();
        const { x, y } = options?.position ?? {};

        // System coordinates for browser and for chemistry files format (mol, ket, etc.) area are different.
        // It needs to rotate them by 180 degrees in y-axis.
        this.editor.structToAddFragment(struct, x, isNumber(y) ? -y : y);

        // Restore selection from initiallySelected flags in the loaded structure
        this.editor.selection(getSelectionFromStruct(this.editor.struct()));
        // Clean up initiallySelected flags after restoring selection
        this.editor.struct().disableInitiallySelected();
      }
    }, this.eventBus);
  }

  async circularLayoutMonomers() {
    const editor = provideEditorInstance();

    await runAsyncAction<void>(async () => {
      if (window.isPolymerEditorTurnedOn) {
        const ketSerializer = new KetSerializer();
        const serializedKet = ketSerializer.serialize(
          new Struct(),
          editor.drawingEntitiesManager,
          undefined,
          false,
          true,
        );

        const result = await this.structService.layout(
          {
            struct: serializedKet,
            output_format: ChemicalMimeType.KET,
          },
          {
            'smart-layout': false,
          },
        );

        deleteAllEntitiesOnCanvas();
        await parseAndAddMacromoleculesOnCanvas(
          result.struct,
          this.structService,
          true,
        );
      }
    }, this.eventBus);
  }

  async layout(): Promise<void> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('Layout is not available in macro mode');
    }

    await runAsyncAction<void>(async () => {
      const struct = await this._indigo.layout(
        this.editor.struct(),
        this.editor.serverSettings,
      );
      const ketSerializer = new KetSerializer();
      await this.setMolecule(ketSerializer.serialize(struct));
    }, this.eventBus);
  }

  async aromatize(): Promise<void> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('Aromatize is not available in macro mode');
    }

    await runAsyncAction<void>(async () => {
      const struct = await this._indigo.aromatize(this.editor.struct());
      const ketSerializer = new KetSerializer();
      await this.setMolecule(ketSerializer.serialize(struct), {
        preserveCanvasPosition: true,
      });
    }, this.eventBus);
  }

  async dearomatize(): Promise<void> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('Dearomatize is not available in macro mode');
    }

    await runAsyncAction<void>(async () => {
      const struct = await this._indigo.dearomatize(this.editor.struct());
      const ketSerializer = new KetSerializer();
      await this.setMolecule(ketSerializer.serialize(struct), {
        preserveCanvasPosition: true,
      });
    }, this.eventBus);
  }

  async calculate(options?: CalculateData): Promise<CalculateResult> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('Calculate is not available in macro mode');
    }
    return await this._indigo.calculate(this.editor.struct(), options);
  }

  /**
   * @param {number} value - in a range [ZoomTool.instance.MINZOOMSCALE, ZoomTool.instance.MAXZOOMSCALE]
   */
  setZoom(value: number) {
    const editor = provideEditorInstance();
    if (editor && value) editor.zoomTool.zoomTo(value);
  }

  getZoom(): number {
    const editor = provideEditorInstance();
    if (editor) {
      return editor.zoomTool?.getZoomLevel?.() ?? 1;
    }
    return 1;
  }

  private _zoomChangeHandlers: Array<(zoomLevel: number) => void> = [];

  onZoomChange(handler: (zoomLevel: number) => void): void {
    this._zoomChangeHandlers.push(handler);
  }

  offZoomChange(handler: (zoomLevel: number) => void): void {
    this._zoomChangeHandlers = this._zoomChangeHandlers.filter(
      (h) => h !== handler,
    );
  }

  /** @internal called by the editor layer when zoom changes */
  _dispatchZoomChange(zoomLevel: number): void {
    this._zoomChangeHandlers.forEach((h) => h(zoomLevel));
    if (window.parent !== window) {
      try {
        window.parent.postMessage(
          { eventType: 'zoom:change', data: { zoomLevel } },
          '*',
        );
      } catch {}
    }
  }

  setMode(mode: SupportedModes) {
    const editor = provideEditorInstance();
    if (editor && mode) {
      editor.events.selectMode.dispatch(ModeTypes[mode]);
      editor.events.layoutModeChange.dispatch(ModeTypes[mode]);
    }
  }

  exportImage(format: SupportedImageFormats, params?: ExportImageParams) {
    const editor = provideEditorInstance();
    const fileName = 'ketcher';
    let blobPart;

    if (format === 'svg' && editor?.canvas) {
      blobPart = getSvgFromDrawnStructures(
        editor.canvas,
        'file',
        params?.margin,
      );
    }
    if (!blobPart) {
      throw new Error('Cannot export image');
    }

    const blob = new Blob([blobPart], {
      type: BlobTypes[format],
    });
    saveAs(blob, `${fileName}.${format}`);
  }

  recognize(image: Blob, version?: string): Promise<Struct> {
    if (window.isPolymerEditorTurnedOn) {
      throw new Error('Recognize is not available in macro mode');
    }
    return this._indigo.recognize(image, { version });
  }

  async generateImage(
    data: string,
    options: GenerateImageOptions = {
      outputFormat: 'png',
    },
  ): Promise<Blob> {
    let meta = '';

    switch (options.outputFormat) {
      case 'svg':
        meta = 'image/svg+xml';
        break;

      case 'png':
      default:
        meta = 'image/png';
        options.outputFormat = 'png';
    }
    const serverSettings = this.editor.serverSettings;

    const base64 = await this.structService.generateImageAsBase64(data, {
      ...serverSettings,
      ...options,
    });
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: meta });
    return blob;
  }

  public reinitializeIndigo(structService: StructService) {
    this.structService = structService;
    this._indigo = new Indigo(structService);
  }

  public sendCustomAction(name: string) {
    this.eventBus.emit('CUSTOM_BUTTON_PRESSED', name);
  }

  /**
   * Converts raw monomer data to KET format before it is sent to the editor.
   *
   * @throws {Error} When conversion fails or the server rejects the payload.
   *   The thrown message is prefixed with
   *   "Monomer item could not be loaded because of an error: ".
   */
  public async ensureMonomersLibraryDataInKetFormat(
    rawMonomersData: string | JSON,
    params?: UpdateMonomersLibraryParams,
  ) {
    const serverSettings = this.editor.serverSettings;
    const rawMonomersDataString = ensureString(rawMonomersData);
    const format =
      params?.format ?? identifyStructFormat(rawMonomersDataString);
    let dataInKetFormat: string | JSON;

    if (format === SupportedFormat.ket) {
      dataInKetFormat = rawMonomersDataString;
    } else {
      try {
        const convertResult = await this.structService.convert(
          {
            struct: rawMonomersDataString,
            input_format: MONOMER_LIBRARY_FORMAT_OPTIONS.inputFormat,
            output_format: MONOMER_LIBRARY_FORMAT_OPTIONS.outputFormat,
          },
          {
            ...serverSettings,
            outputContentType: MONOMER_LIBRARY_FORMAT_OPTIONS.outputContentType,
          },
        );

        dataInKetFormat = convertResult.struct;
      } catch (error) {
        const originalMessage =
          error instanceof Error ? error.message : String(error);
        throw new MonomerLibraryConvertError(
          `Monomer item could not be loaded because of an error: ${originalMessage}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    return dataInKetFormat;
  }

  public async ensureMonomersLibraryDataInSdfFormat(
    rawMonomersData: string | JSON,
    params?: UpdateMonomersLibraryParams,
  ) {
    const rawMonomersDataString = ensureString(rawMonomersData);
    const format =
      params?.format ?? identifyStructFormat(rawMonomersDataString);

    if (format === SupportedFormat.sdf || format === SupportedFormat.sdfV3000) {
      return rawMonomersDataString;
    }

    const convertResult = await this.indigo.convert(rawMonomersDataString, {
      ...MONOMER_LIBRARY_FORMAT_OPTIONS,
      monomerLibrarySavingMode: 'sdf',
      molfileSavingSkipDate: 'true',
    });

    return convertResult.struct;
  }

  public async updateMonomersLibrary(
    rawMonomersData: string | JSON,
    params?: UpdateMonomersLibraryParams,
  ) {
    const editor = provideEditorInstance();

    ketcherProvider.getKetcher(this.id);

    if (!editor) {
      throw new Error(
        'Updating monomer library in small molecules mode is not allowed, please switch to macromolecules mode',
      );
    }

    const dataInKetFormat = await this.ensureMonomersLibraryDataInKetFormat(
      rawMonomersData,
      params,
    );

    const dataInSdfFormat = await this.ensureMonomersLibraryDataInSdfFormat(
      rawMonomersData,
      params,
    );

    editor.updateMonomersLibrary(dataInKetFormat);
    if (SettingsManager.persistMonomerLibraryUpdates && params?.shouldPersist) {
      const updateString = ensureString(dataInKetFormat);
      SettingsManager.addMonomerLibraryUpdate(updateString);
    }
    if (params?.needDispatchLibraryUpdateEvent) {
      this.libraryUpdateEvent.dispatch(dataInSdfFormat);
    }
  }

  public async replaceMonomersLibrary(
    rawMonomersData: string | JSON,
    params?: UpdateMonomersLibraryParams,
  ) {
    const editor = provideEditorInstance();

    ketcherProvider.getKetcher(this.id);

    if (!editor) {
      throw new Error(
        'Updating monomer library in small molecules mode is not allowed, please switch to macromolecules mode',
      );
    }

    const dataInKetFormat = await this.ensureMonomersLibraryDataInKetFormat(
      rawMonomersData,
      params,
    );

    const dataInSdfFormat = await this.ensureMonomersLibraryDataInSdfFormat(
      rawMonomersData,
      params,
    );

    editor.clearMonomersLibrary();
    editor.updateMonomersLibrary(dataInKetFormat);

    if (params?.needDispatchLibraryUpdateEvent) {
      this.libraryUpdateEvent.dispatch(dataInSdfFormat);
    }

    editor.events.updateMonomersLibrary.dispatch();
  }

  public switchToMacromoleculesMode() {
    const editor = provideEditorInstance();

    if (!editor) {
      KetcherLogger.error('Editor instance is not available');

      return;
    }

    editor.events.switchToMacromoleculesMode.dispatch();
  }

  public switchToMoleculesMode() {
    const editor = provideEditorInstance();

    if (!editor) {
      KetcherLogger.error('Editor instance is not available');

      return;
    }

    editor.events.switchToMoleculesMode.dispatch();
  }
}
