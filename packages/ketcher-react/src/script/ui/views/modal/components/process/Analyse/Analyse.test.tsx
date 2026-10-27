import { render, screen } from '@testing-library/react';
import { AnalyseDialog } from './Analyse';
import type { DialogParams } from '../../../../../../../components/Dialog/Dialog';

jest.mock('./components', () => ({
  FormulaInput: ({ value }: { value: string }) => (
    <input data-testid="formula" value={value} readOnly />
  ),
  FrozenInput: ({ value, ...props }: { value: string }) => (
    <input {...props} value={value} readOnly />
  ),
}));
jest.mock('../../../../components', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
jest.mock('../../../../../component/form/Select', () => () => <span />);
jest.mock('../../../../../state/server', () => ({ analyse: jest.fn() }));
jest.mock('../../../../../state/options', () => ({ changeRound: jest.fn() }));
jest.mock('../../../../../utils', () => ({
  getSelectOptionsFromSchema: () => [],
}));
jest.mock('../../../../../../../i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

describe('calculated values', () => {
  const commonProps = {
    ...({} as DialogParams),
    round: { roundWeight: 2, roundMass: 4, roundElAnalysis: 2 },
    loading: false,
    onAnalyse: jest.fn(),
    onChangeRound: jest.fn(),
  };

  it('displays most abundant mass separately from monoisotopic mass and rounds composition', () => {
    render(
      <AnalyseDialog
        {...commonProps}
        values={{
          gross: 'C2H6O',
          'molecular-weight': 46.06844,
          'most-abundant-mass': '46.04257',
          'monoisotopic-mass': 46.04186,
          'mass-composition': 'C 52.1445 H 13.1307 O 34.7248',
        }}
      />,
    );

    expect(screen.getByTestId('analyse.mostAbundantMass-input')).toHaveValue(
      '46.0426',
    );
    expect(screen.getByTestId('analyse.exactMass-input')).toHaveValue(
      '46.0419',
    );
    expect(screen.getByTestId('analyse.elementalAnalysis-input')).toHaveValue(
      'C 52.14 H 13.13 O 34.72',
    );
    expect(commonProps.onAnalyse).toHaveBeenCalledTimes(1);
  });

  it('leaves unavailable values blank instead of displaying a fabricated zero', () => {
    render(
      <AnalyseDialog {...commonProps} values={{ 'molecular-weight': 0 }} />,
    );
    expect(screen.getByTestId('analyse.mostAbundantMass-input')).toHaveValue(
      '',
    );
    expect(screen.getByTestId('analyse.molecularWeight-input')).toHaveValue(
      '0.00',
    );
    expect(screen.getByTestId('analyse.elementalAnalysis-input')).toHaveValue(
      '',
    );
  });
});
