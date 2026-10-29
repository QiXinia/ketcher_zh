import toolActions from '../../action/tools';

const toolsWithoutTitles = new Set([
  'bonds',
  'arrows',
  'reaction-mapping-tools',
  'rgroup',
  'shapes',
  // Empty bond type is a schema placeholder, not a selectable tool.
  'bond-',
]);
const isToolWithTitle = (tool) => !toolsWithoutTitles.has(tool);
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
