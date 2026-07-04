import type { ReactElement } from 'react';

// Each entry is transcribed exactly from its Figma SVG source (path data unchanged), with the
// original stroke/fill color swapped for currentColor so a single component can serve every
// color variant Figma exports as a separate asset (e.g. voice-square active/inactive).
const ICON_PATHS: Record<IconName, { viewBox: string; svg: ReactElement }> = {
  'arrow-down': {
    viewBox: '0 0 16 16',
    svg: (
      <path
        d="M13.28 5.96667L8.93333 10.3133C8.42 10.8267 7.58 10.8267 7.06667 10.3133L2.72 5.96667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  flat: {
    viewBox: '0 0 24 24',
    svg: (
      <path
        d="M9 4V15.5M9 15.5V20.5C11 20.5 15 20 15 15.5C15 11 9 14 9 15.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
  sharp: {
    viewBox: '0 0 24 24',
    svg: (
      <path
        d="M9 4.5V21.5M15 3V19.5M6 18L18 13M6 10.5L18 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
  'voice-square': {
    viewBox: '0 0 26 26',
    svg: (
      <path
        d="M17.5392 2.16667H8.46083C4.5175 2.16667 2.16667 4.5175 2.16667 8.46083V17.5283C2.16667 21.4825 4.5175 23.8333 8.46083 23.8333H17.5283C21.4717 23.8333 23.8225 21.4825 23.8225 17.5392V8.46083C23.8333 4.5175 21.4825 2.16667 17.5392 2.16667ZM7.3125 15.3183C7.3125 15.7625 6.94417 16.1308 6.5 16.1308C6.05583 16.1308 5.6875 15.7625 5.6875 15.3183V10.6817C5.6875 10.2375 6.05583 9.86917 6.5 9.86917C6.94417 9.86917 7.3125 10.2375 7.3125 10.6817V15.3183ZM10.5625 16.8675C10.5625 17.3117 10.1942 17.68 9.75 17.68C9.30583 17.68 8.9375 17.3117 8.9375 16.8675V9.1325C8.9375 8.68833 9.30583 8.32 9.75 8.32C10.1942 8.32 10.5625 8.68833 10.5625 9.1325V16.8675ZM13.8125 18.4167C13.8125 18.8608 13.4442 19.2292 13 19.2292C12.5558 19.2292 12.1875 18.8608 12.1875 18.4167V7.58333C12.1875 7.13917 12.5558 6.77083 13 6.77083C13.4442 6.77083 13.8125 7.13917 13.8125 7.58333V18.4167ZM17.0625 16.8675C17.0625 17.3117 16.6942 17.68 16.25 17.68C15.8058 17.68 15.4375 17.3117 15.4375 16.8675V9.1325C15.4375 8.68833 15.8058 8.32 16.25 8.32C16.6942 8.32 17.0625 8.68833 17.0625 9.1325V16.8675ZM20.3125 15.3183C20.3125 15.7625 19.9442 16.1308 19.5 16.1308C19.0558 16.1308 18.6875 15.7625 18.6875 15.3183V10.6817C18.6875 10.2375 19.0558 9.86917 19.5 9.86917C19.9442 9.86917 20.3125 10.2375 20.3125 10.6817V15.3183Z"
        fill="currentColor"
      />
    ),
  },
};

export type IconName = 'arrow-down' | 'flat' | 'sharp' | 'voice-square';

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
  readonly className?: string;
}

export function Icon({ name, size = 24, color = 'currentColor', className }: IconProps): ReactElement {
  const { viewBox, svg } = ICON_PATHS[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={viewBox}
      style={{ color, display: 'block', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {svg}
    </svg>
  );
}
