import { fireEvent, render, screen } from '@testing-library/react';
import ErrorsCheck from './ErrorsCheck';

describe('ErrorsCheck', () => {
  it('offers atom navigation for warnings with known locations', () => {
    const onSelectWarningEntities = jest.fn();

    render(
      <ErrorsCheck
        moleculeErrors={{
          valence: 'Structure contains 2 atoms with bad valence',
        }}
        moleculeErrorLocations={{
          valence: { atoms: [3, 8], bonds: [] },
        }}
        checkSchema={{
          title: 'Check Structure',
          type: 'object',
          properties: {
            checkOptions: {
              title: 'Settings',
              type: 'array',
              items: {
                type: 'string',
                enum: ['valence'],
                enumNames: ['Valence'],
              },
            },
          },
        }}
        onSelectWarningEntities={onSelectWarningEntities}
      />,
    );

    fireEvent.click(screen.getByTestId('locate-valence-warning'));

    expect(onSelectWarningEntities).toHaveBeenCalledWith([3, 8], []);

    fireEvent.click(
      screen
        .getByTestId('locate-valence-per-object')
        .querySelector('summary')!,
    );
    fireEvent.click(screen.getByTestId('locate-valence-atom-8'));

    expect(onSelectWarningEntities).toHaveBeenLastCalledWith([8], []);
  });

  it('shows bond endpoints and selects the indexed bonds', () => {
    const onSelectWarningEntities = jest.fn();

    render(
      <ErrorsCheck
        moleculeErrors={{ overlapping_bonds: 'Two bonds overlap' }}
        moleculeErrorLocations={{
          overlapping_bonds: {
            atoms: [0, 1],
            bonds: [{ id: 5, begin: 0, end: 1 }],
          },
        }}
        checkSchema={{
          title: 'Check Structure',
          type: 'object',
          properties: {
            checkOptions: {
              title: 'Settings',
              type: 'array',
              items: {
                type: 'string',
                enum: ['overlapping_bonds'],
                enumNames: ['Overlapping bonds'],
              },
            },
          },
        }}
        onSelectWarningEntities={onSelectWarningEntities}
      />,
    );

    fireEvent.click(screen.getByTestId('locate-overlapping_bonds-warning'));

    expect(
      screen.getByTestId('locate-overlapping_bonds-bond-5'),
    ).toBeInTheDocument();
    expect(onSelectWarningEntities).toHaveBeenCalledWith([0, 1], [5]);

    fireEvent.click(
      screen
        .getByTestId('locate-overlapping_bonds-per-object')
        .querySelector('summary')!,
    );
    fireEvent.click(screen.getByTestId('locate-overlapping_bonds-bond-5'));

    expect(onSelectWarningEntities).toHaveBeenLastCalledWith([], [5]);
  });

  it('does not render a location action when the checker has no atom ids', () => {
    render(
      <ErrorsCheck
        moleculeErrors={{ chiral_flag: 'Chiral flag is present on the canvas' }}
        moleculeErrorLocations={{}}
        checkSchema={{
          title: 'Check Structure',
          type: 'object',
          properties: {
            checkOptions: {
              title: 'Settings',
              type: 'array',
              items: {
                type: 'string',
                enum: ['chiral_flag'],
                enumNames: ['Chiral flag'],
              },
            },
          },
        }}
        onSelectWarningEntities={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId('locate-chiral_flag-warning'),
    ).not.toBeInTheDocument();
  });
});
