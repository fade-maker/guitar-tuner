import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  AdvancedStatusBadge,
  AppHeader,
  BassIllustration,
  Button,
  CheckIndicator,
  CurrentTargetNote,
  FooterNavigation,
  GuitarIllustration,
  Icon,
  InTuneZone,
  NoteCircle,
  SimplePitchBadge,
  StringControl,
  StringNoteChip,
  ToggleSwitch,
} from '../components/ui';
import { SimpleTunerScreen } from '../components/screens';

// Temporary, throwaway visual QA gallery - not part of the production app, not a screen. Used to
// self-compare every ui/ primitive against Figma via a screenshot. Delete alongside src/debug/ once
// screens are built and this is no longer needed for spot-checks.
function Row({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ color: '#9c9a92', fontSize: 12, marginBottom: 8, fontFamily: 'monospace' }}>{title}</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

export function ComponentGallery(): ReactElement {
  const [auto, setAuto] = useState(true);
  const [tab, setTab] = useState<'Tuner' | 'Settings'>('Tuner');

  return (
    <div style={{ background: '#121212', minHeight: '100vh', padding: 32 }}>
      <Row title="Button">
        <Button variant="primary" size="large">Button</Button>
        <Button variant="primary" size="small">Button</Button>
        <Button variant="primary" size="large" disabled>Button</Button>
        <Button variant="secondary" size="large">Button</Button>
        <Button variant="secondary" size="small">Button</Button>
        <Button variant="secondary" size="large" disabled>Button</Button>
      </Row>

      <Row title="ToggleSwitch">
        <ToggleSwitch checked={auto} onChange={setAuto} />
        <ToggleSwitch checked={!auto} onChange={() => {}} />
      </Row>

      <Row title="CheckIndicator">
        <CheckIndicator state="Active" />
        <CheckIndicator state="Default" />
      </Row>

      <Row title="Icon">
        <Icon name="arrow-down" />
        <Icon name="flat" />
        <Icon name="sharp" />
        <Icon name="voice-square" />
      </Row>

      <Row title="StringControl">
        <StringControl label="E" state="Default" />
        <StringControl label="A" state="In tune" />
        <StringControl label="D" state="Tuned" />
      </Row>

      <Row title="SimplePitchBadge">
        <SimplePitchBadge state="In tune" />
        <SimplePitchBadge state="Tune up" cents={11} />
        <SimplePitchBadge state="Tune down" cents={11} />
      </Row>

      <Row title="AdvancedStatusBadge">
        <AdvancedStatusBadge state="In tune" />
        <AdvancedStatusBadge state="Tune up" />
        <AdvancedStatusBadge state="Tune down" />
      </Row>

      <Row title="CurrentTargetNote / StringNoteChip">
        <CurrentTargetNote note="E" octave={2} />
        <StringNoteChip note="E" octave={2} />
      </Row>

      <Row title="NoteCircle">
        <NoteCircle note="E" state="In tune" />
        <NoteCircle note="E" state="Searching" />
      </Row>

      <Row title="InTuneZone">
        <InTuneZone state="Default" />
        <InTuneZone state="Tuning started" />
      </Row>

      <Row title="GuitarIllustration / BassIllustration">
        <GuitarIllustration />
        <BassIllustration />
      </Row>

      <Row title="AppHeader - Default">
        <div style={{ width: 402 }}>
          <AppHeader
            variant="Default"
            title="Guitar 6-string"
            subtitle="Standard"
            frequencyLabel="440Hz"
            autoMode={auto}
            onAutoModeChange={setAuto}
          />
        </div>
      </Row>

      <Row title="AppHeader - Advanced">
        <div style={{ width: 402 }}>
          <AppHeader variant="Advanced" title="Advanced tuning" frequencyLabel="440Hz" />
        </div>
      </Row>

      <Row title="FooterNavigation">
        <div style={{ width: 402 }}>
          <FooterNavigation active={tab} onSelect={setTab} />
        </div>
      </Row>

      <Row title="SimpleTunerScreen (assembled)">
        <SimpleTunerScreen />
      </Row>
    </div>
  );
}
