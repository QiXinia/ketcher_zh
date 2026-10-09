import toolActions from '../../action/tools';

const toolsWithoutTitles = [
  'bonds',
  'arrows',
  'reaction-mapping-tools',
  'rgroup',
  'shapes',
  // Empty bond type ('') is a placeholder in the bond-properties schema, not a
  // selectable toolbar tool, and intentionally has no title
  'bond-',
];
const isToolWithTitle = (tool) => !toolsWithoutTitles.includes(tool);
const toolsWithTitles = Object.keys(toolActions).filter(isToolWithTitle);

describe('ToolActions', () => {
  it('should have a "title" property for each tool that is not hidden', () => {
    toolsWithTitles.forEach((toolKey) => {
      const tool = toolActions[toolKey];
      if (tool.title === undefined) {
        console.error(`Tool without title: ${toolKey}`);
      }
      expect(tool.title).toBeTruthy();
    });
  });
});
