import type { ReactElement } from 'react';
import guitarMask from './assets/guitar-mask.png';
import guitarPhoto from './assets/guitar-photo.png';
import styles from './GuitarIllustration.module.css';

export function GuitarIllustration(): ReactElement {
  return (
    <div className={styles.container}>
      <div
        className={styles.masked}
        style={{ maskImage: `url(${guitarMask})`, WebkitMaskImage: `url(${guitarMask})` }}
      >
        <img src={guitarPhoto} alt="" className={styles.photo} />
      </div>
    </div>
  );
}
