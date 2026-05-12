declare module 'ketcher-macromolecules' {
  import * as React from 'react';
  interface MacromoleculesEditorProps {
    ketcherId: string;
    togglerComponent?: React.ReactElement;
  }
  const MacromoleculesEditor: React.ComponentType<MacromoleculesEditorProps>;
  export default MacromoleculesEditor;
}
