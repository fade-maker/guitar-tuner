import type { ReactElement } from 'react';
import bassPhoto from '../BassIllustration/assets/bass-photo.png';
import bassMaskSmall from './assets/bass-mask-small.svg';
import styles from './BassIllustrationSmall.module.css';

// Figma's "SelectTuning - Bass" variant (163:3976) of the Guitars component set - a distinct
// component from BassIllustration ("Property 1=Bass", 144:1609), not that component scaled down
// via CSS. Same source photo (byte-identical to BassIllustration's own bass-photo.png, confirmed
// via md5sum before reusing rather than duplicating the asset - only the crop/mask differs), used
// on Select Tuning, which previously approximated this with `transform: scale()` on the full-size
// BassIllustration instead of this real component.
export function BassIllustrationSmall(): ReactElement {
  return (
    <div className={styles.container}>
      <div
        className={styles.masked}
        style={{ maskImage: `url(${bassMaskSmall})`, WebkitMaskImage: `url(${bassMaskSmall})` }}
      >
        <div className={styles.crop}>
          <img src={bassPhoto} alt="" className={styles.photo} />
        </div>
      </div>
    </div>
  );
}
