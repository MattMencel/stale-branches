import styles from 'ansi-styles'

export function logLastCommitColor(commitAge, daysBeforeStale, daysBeforeDelete, ignoredCommitInfo?: {ignoredCount: number; usedFallback: boolean}): string {
  let commitColor = `Last Commit: ${styles.magenta.open}${commitAge.toString()}${styles.magenta.close} days ago.`

  //color group based on age of branch
  if (commitAge > daysBeforeDelete) {
    commitColor = `Last Commit: ${styles.redBright.open}${commitAge.toString()}${styles.redBright.close} days ago.`
  } else if (commitAge > daysBeforeStale) {
    commitColor = `Last Commit: ${styles.yellowBright.open}${commitAge.toString()}${styles.yellowBright.close} days ago.`
  } else if (commitAge < daysBeforeStale) {
    commitColor = `Last Commit: ${styles.greenBright.open}${commitAge.toString()}${styles.greenBright.close} days ago.`
  }

  if (ignoredCommitInfo && ignoredCommitInfo.ignoredCount > 0) {
    commitColor += ` ${styles.cyan.open}(ignored ${ignoredCommitInfo.ignoredCount} commit${ignoredCommitInfo.ignoredCount > 1 ? 's' : ''} matching filter${ignoredCommitInfo.usedFallback ? ', used fallback' : ''})${styles.cyan.close}`
  }

  return commitColor
}
