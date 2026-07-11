import type { ReactElement } from 'react';
import { AppShell, ErrorBoundary } from './components/layout';
import { AppProviders } from './providers';

// Real entry point, mounted by main.tsx via index.html. Composition only - no business logic here.
// AppProviders/AppShell are both already-tested (providers/AppProviders.test.tsx,
// components/layout/AppShell.test.tsx); this file just wires them together at the root, replacing
// the original raw-needle debug harness that lived here through Stage 1-8 (see CLAUDE.md's log).
// That harness's manual-testing purpose is already covered by debug.html/DebugSettingsPanel.tsx,
// which is why it wasn't duplicated into a new debug page - it wasn't unique functionality, just an
// earlier, less complete version of the same thing.
//
// AppShell (not AppRouter directly) is the root now - it owns the single, app-wide ViewportScreen
// and Bottom Navigation instance, with AppRouter's routed screens rendering inside it. See
// components/layout/AppShell.tsx for why this replaced each screen creating its own footer.
function App(): ReactElement {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
