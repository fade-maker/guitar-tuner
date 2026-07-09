import type { ReactElement } from 'react';
import guitarPhoto from '../GuitarIllustration/assets/guitar-photo.png';
import guitarMaskSmall from './assets/guitar-mask-small.svg';
import styles from './GuitarIllustrationSmall.module.css';

// Figma's "SelectTuning - Guitar" variant (163:3954) of the Guitars component set - a distinct
// component from GuitarIllustration ("Property 1=6-string", 144:1607), not that component scaled
// down via CSS. Same source photo (byte-identical to GuitarIllustration's own guitar-photo.png,
// confirmed via md5sum before reusing rather than duplicating the asset), but its own dedicated
// mask sized for this smaller box - used on Select Tuning, which previously approximated this with
// `transform: scale()` on the full-size GuitarIllustration instead of this real component.
export function GuitarIllustrationSmall(): ReactElement {
  return (
    <div className={styles.container}>
      <div
        className={styles.masked}
        style={{ maskImage: `url(${guitarMaskSmall})`, WebkitMaskImage: `url(${guitarMaskSmall})` }}
      >
        <img src={guitarPhoto} alt="" className={styles.photo} />
      </div>
    </div>
  );
}
