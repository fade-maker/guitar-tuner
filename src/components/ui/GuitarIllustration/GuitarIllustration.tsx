import type { ReactElement } from 'react';
import guitarMask from './assets/guitar-mask.png';
import guitarPhoto from './assets/guitar-photo.png';
import styles from './GuitarIllustration.module.css';

export function GuitarIllustration(): ReactElement {
  return (
    <div className={styles.container}>
      <div
        className={styles.masked}
        style={{ maskImage: `url("${guitarMask}")`, WebkitMaskImage: `url("${guitarMask}")` }}
      >
        {/* decoding=async keeps this ~860KB photo's decode off the critical rendering path of the
            mount frame - it lands mid-screen-transition otherwise (audit H3). */}
        <img src={guitarPhoto} alt="" decoding="async" className={styles.photo} />
      </div>
    </div>
  );
}
