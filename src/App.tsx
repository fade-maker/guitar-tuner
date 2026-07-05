import type { ReactElement } from 'react';
import { AppRouter } from './navigation';
import { AppProviders } from './providers';

// Real entry point, mounted by main.tsx via index.html. Composition only - no business logic here.
// AppProviders/AppRouter are both already-tested (providers/AppProviders.test.tsx,
// navigation/AppRouter.test.tsx); this file just wires them together at the root, replacing the
// original raw-needle debug harness that lived here through Stage 1-8 (see CLAUDE.md's log). That
// harness's manual-testing purpose is already covered by debug.html/DebugSettingsPanel.tsx, which
// is why it wasn't duplicated into a new debug page - it wasn't unique functionality, just an
// earlier, less complete version of the same thing.
function App(): ReactElement {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
