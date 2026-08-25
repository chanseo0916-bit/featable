import styles from "@/components/board-split-panel.module.css";

export default function BoardPanelLoading() {
  return (
    <div className={styles.loading} aria-label="게시판 불러오는 중" aria-busy="true">
      <div className={styles.loadingTabs} />
      <div className={styles.loadingHeading} />
      {[0, 1, 2, 3, 4].map((item) => (
        <div className={styles.loadingPost} key={item}>
          <span />
          <strong />
          <i />
        </div>
      ))}
    </div>
  );
}
