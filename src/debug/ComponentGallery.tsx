import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  AdvancedStatusBadge,
  AppHeader,
  BassIllustration,
  BassIllustrationSmall,
  Button,
  CheckIndicator,
  CurrentTargetNote,
  FooterNavigation,
  GuitarIllustration,
  GuitarIllustrationSmall,
  Icon,
  InTuneZone,
  NoteCircle,
  SegmentedControl,
  SimplePitchBadge,
  StepperButton,
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

// Labels a swatch with its state name below it - needed for StepperButton's Hover/Pressed rows,
// which aren't reachable in a static screenshot (they're :hover/:active pseudo-classes, not props)
// without saying which forced swatch is standing in for which state.
function Labeled({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {children}
      <span style={{ color: '#7b7a82', fontSize: 10, fontFamily: 'monospace' }}>{label}</span>
    </div>
  );
}

export function ComponentGallery(): ReactElement {
  const [auto, setAuto] = useState(true);
  const [tab, setTab] = useState<'Tuner' | 'Settings'>('Tuner');
  const [instrument, setInstrument] = useState<'guitar' | 'bass'>('guitar');

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

      {/* Hover/Pressed are :hover/:active pseudo-classes, not props - unreachable in a static
          screenshot without forcing them. `style` forces the exact same background each pseudo-class
          would apply on real interaction (see StepperButton.module.css), purely for this gallery -
          the real component is never given a style override anywhere else. */}
      <Row title="StepperButton - Large (Default / Hover / Pressed / Disabled)">
        <Labeled label="+ Default">
          <StepperButton type="+" size="large" />
        </Labeled>
        <Labeled label="+ Hover">
          <StepperButton type="+" size="large" style={{ background: '#333333' }} />
        </Labeled>
        <Labeled label="+ Pressed">
          <StepperButton type="+" size="large" style={{ background: '#4d4d4d' }} />
        </Labeled>
        <Labeled label="+ Disabled">
          <StepperButton type="+" size="large" disabled />
        </Labeled>
        <Labeled label="- Default">
          <StepperButton type="-" size="large" />
        </Labeled>
        <Labeled label="- Hover">
          <StepperButton type="-" size="large" style={{ background: '#333333' }} />
        </Labeled>
        <Labeled label="- Pressed">
          <StepperButton type="-" size="large" style={{ background: '#4d4d4d' }} />
        </Labeled>
        <Labeled label="- Disabled">
          <StepperButton type="-" size="large" disabled />
        </Labeled>
      </Row>

      <Row title="StepperButton - Small (Default / Hover / Pressed / Disabled)">
        <Labeled label="+ Default">
          <StepperButton type="+" size="small" />
        </Labeled>
        <Labeled label="+ Hover">
          <StepperButton type="+" size="small" style={{ background: '#333333' }} />
        </Labeled>
        <Labeled label="+ Pressed">
          <StepperButton type="+" size="small" style={{ background: '#4d4d4d' }} />
        </Labeled>
        <Labeled label="+ Disabled">
          <StepperButton type="+" size="small" disabled />
        </Labeled>
        <Labeled label="- Default">
          <StepperButton type="-" size="small" />
        </Labeled>
        <Labeled label="- Hover">
          <StepperButton type="-" size="small" style={{ background: '#333333' }} />
        </Labeled>
        <Labeled label="- Pressed">
          <StepperButton type="-" size="small" style={{ background: '#4d4d4d' }} />
        </Labeled>
        <Labeled label="- Disabled">
          <StepperButton type="-" size="small" disabled />
        </Labeled>
      </Row>

      <Row title="SegmentedControl">
        <div style={{ width: 366 }}>
          <SegmentedControl
            options={[
              { value: 'guitar', label: 'Guitar 6-string' },
              { value: 'bass', label: 'Bass 4-string' },
            ]}
            value={instrument}
            onChange={setInstrument}
          />
        </div>
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
        <StringControl label="G" state="Selected" />
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
        <StringNoteChip note="C#" octave={3} />
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

      {/* Select Tuning's own dedicated small illustrations (Figma: "SelectTuning - Guitar"/
          "SelectTuning - Bass", 163:3954/163:3976) - distinct components with their own mask, not
          GuitarIllustration/BassIllustration scaled down via CSS transform. */}
      <Row title="GuitarIllustrationSmall / BassIllustrationSmall">
        <GuitarIllustrationSmall />
        <BassIllustrationSmall />
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
