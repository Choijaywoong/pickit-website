// 온보딩 통합 진행바 컴포넌트 — 좌: N단계·단계명, 우: N/총단계, 하단: 진행바 (ONBOARDING_UI_SPEC 2-2)
// totalSteps: 직접 보유 4 / 위탁 판매 3 (1단계 응답에 따라 부모가 결정)
// progress: null이면 step/totalSteps 자동 계산, 0~100이면 직접 지정 (4단계 채널별 진행 시 사용)
import styles from './ProgressBar.module.css';

export default function ProgressBar({ step, totalSteps, stepName, progress = null }) {
  const fillPct = progress !== null
    ? Math.min(100, Math.max(0, progress))
    : Math.round((step / totalSteps) * 100);

  return (
    <div className={styles.wrapper}>
      <div className={styles.labelRow}>
        <span className={styles.stepLabel}>{step}단계 · {stepName}</span>
        <span className={styles.stepCount}>{step} / {totalSteps}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${fillPct}%` }} />
      </div>
    </div>
  );
}
