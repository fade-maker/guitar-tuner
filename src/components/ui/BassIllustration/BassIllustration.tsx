import type { ReactElement } from 'react';
import bassPhoto from './assets/bass-photo.png';
import styles from './BassIllustration.module.css';

export function BassIllustration(): ReactElement {
  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        <div className={styles.crop}>
          {/* Same decode-off-the-mount-frame reasoning as GuitarIllustration (audit H3). */}
          <img src={bassPhoto} alt="" decoding="async" className={styles.photo} />
        </div>
      </div>
    </div>
  );
}
