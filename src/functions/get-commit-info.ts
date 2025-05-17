import * as core from '@actions/core'
import * as assert from 'assert'
import {github, owner, repo} from './get-context'
import {getDays} from './utils/get-time'

/**
 * Retrieves the most recent non-ignored commit's committer and age.
 *
 * @param {string} sha The SHA of the branch head
 * @param {string[]} [ignoredMessages] Array of commit messages or substrings to ignore
 * @param {number} [maxAgeDays] Optional. If provided, stop searching if a commit is older than this many days.
 * @param {string[]} [ignoredCommitters] Optional. List of committer usernames/names to ignore.
 *
 * @returns {{ committer: string, age: number, ignoredCount: number, usedFallback: boolean }}
 */
export async function getRecentCommitInfo(
  sha: string,
  ignoredMessages: string[] = [],
  maxAgeDays?: number,
  ignoredCommitters?: string[]
): Promise<{committer: string; age: number; ignoredCount: number; usedFallback: boolean}> {
  const currentDate = Date.now()
  let page = 1
  let commitDate: string | undefined
  let found = false
  let ignoredCount = 0
  let usedFallback = false
  let committer = 'Unknown'

  while (!found) {
    const commitsResponse = await github.rest.repos.listCommits({
      owner,
      repo,
      sha,
      per_page: 100,
      page
    })
    if (commitsResponse.data.length === 0) break
    for (const commit of commitsResponse.data) {
      const message = commit.commit?.message || ''
      const commitDateStr = commit.commit?.committer?.date
      if (!commitDateStr) continue
      const commitDateTime = new Date(commitDateStr).getTime()
      const commitAge = getDays(currentDate, commitDateTime)
      if (maxAgeDays !== undefined && commitAge > maxAgeDays) {
        if (!commitDate) {
          usedFallback = true
          return {committer, age: maxAgeDays, ignoredCount, usedFallback}
        } else {
          found = true
          break
        }
      }
      committer = commit.committer?.login || commit.author?.login || commit.commit?.committer?.name || commit.commit?.author?.name || 'Unknown'
      if (
        ignoredMessages.some(msg => message.includes(msg)) ||
        (ignoredCommitters && ignoredCommitters.length > 0 && ignoredCommitters.some(ignored => ignored && committer && committer.toLowerCase() === ignored.toLowerCase()))
      ) {
        ignoredCount++
        continue
      }
      // Found a valid commit within the window
      commitDate = commitDateStr
      found = true
      break
    }
    if (found) break
    page++
  }
  if (commitDate) {
    const commitDateTime = new Date(commitDate).getTime()
    const age = getDays(currentDate, commitDateTime)
    return {committer, age, ignoredCount, usedFallback}
  }
  throw new Error('No non-ignored commit found')
}
