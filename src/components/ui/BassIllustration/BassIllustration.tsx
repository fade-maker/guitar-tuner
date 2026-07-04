import type { ReactElement } from 'react';
import bassPhoto from './assets/bass-photo.png';
import styles from './BassIllustration.module.css';

export function BassIllustration(): ReactElement {
  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        <div className={styles.crop}>
          <img src={bassPhoto} alt="" className={styles.photo} />
        </div>
      </div>
    </div>
  );
}
