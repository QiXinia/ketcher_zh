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
import i18n from '../../../../../../../../i18n';
import type { MoleculeErrorLocations } from '../../../../../../state/server/checkLocations';

interface CheckSchemaItem {
  type: string;
  enum: string[];
  enumNames: string[];
}

interface CheckSchemaProperties {
  checkOptions: {
    title: string;
    type: string;
    items: CheckSchemaItem;
  };
}

interface CheckSchema {
  title: string;
  type: string;
  properties: CheckSchemaProperties;
}

interface MoleculeErrors {
  [key: string]: string;
}

interface ErrorsCheckProps {
  moleculeErrors: MoleculeErrors;
  moleculeErrorLocations: MoleculeErrorLocations;
  checkSchema: CheckSchema;
  onSelectWarningEntities: (atomIds: number[], bondIds: number[]) => void;
}

function ErrorsCheck(props: Readonly<ErrorsCheckProps>) {
  const {
    moleculeErrors,
    moleculeErrorLocations,
    checkSchema,
    onSelectWarningEntities,
  } = props;
  const moleculeErrorsTypes = Object.keys(moleculeErrors);

  const getOptionName = (option: string): string => {
    const { items } = checkSchema.properties.checkOptions;
    const nameIndex = items.enum.indexOf(option);
    return items.enumNames[nameIndex];
  };

  return (
    <fieldset>
      {moleculeErrorsTypes.length === 0 ? (
        <div>
          <dd>{i18n.t('check.noErrorsDetected')}</dd>
        </div>
      ) : (
        moleculeErrorsTypes.map((type) => {
          const location = moleculeErrorLocations[type];
          const atomIds = location?.atoms || [];
          const bonds = location?.bonds || [];
          const affectedEntities = [
            ...atomIds.map((atomId) => ({
              key: `atom-${atomId}`,
              label: `${i18n.t('check.locateAtom')} #${atomId + 1}`,
              atomIds: [atomId],
              bondIds: [],
            })),
            ...bonds.map(({ id, begin, end }) => ({
              key: `bond-${id}`,
              label: `${i18n.t('check.locateBond')} #${begin + 1}-#${end + 1}`,
              atomIds: [],
              bondIds: [id],
            })),
          ];
          return (
            <div key={type} data-testid={`${type}-warning`}>
              <dt>
                {getOptionName(type)} {i18n.t('check.warningSuffix')}
              </dt>
              <dd>{moleculeErrors[type]}</dd>
              {(atomIds.length > 0 || bonds.length > 0) && (
                <dd>
                  <button
                    type="button"
                    data-testid={`locate-${type}-warning`}
                    onClick={() =>
                      onSelectWarningEntities(
                        atomIds,
                        bonds.map(({ id }) => id),
                      )
                    }
                  >
                    {i18n.t('check.locateAffectedEntities')} (
                    {[
                      ...atomIds.map((atomId) => `#${atomId + 1}`),
                      ...bonds.map(
                        ({ begin, end }) =>
                          `${i18n.t('check.bond')} #${begin + 1}-#${end + 1}`,
                      ),
                    ].join(', ')}
                    )
                  </button>
                </dd>
              )}
              {affectedEntities.length > 1 && (
                <dd>
                  <details data-testid={`locate-${type}-per-object`}>
                    <summary>
                      {i18n.t('check.locateEachAffectedEntity')} (
                      {affectedEntities.length})
                    </summary>
                    {affectedEntities.map((entity) => (
                      <div key={entity.key}>
                        <button
                          type="button"
                          data-testid={`locate-${type}-${entity.key}`}
                          onClick={() =>
                            onSelectWarningEntities(
                              entity.atomIds,
                              entity.bondIds,
                            )
                          }
                        >
                          {entity.label}
                        </button>
                      </div>
                    ))}
                  </details>
                </dd>
              )}
            </div>
          );
        })
      )}
    </fieldset>
  );
}

export default ErrorsCheck;
