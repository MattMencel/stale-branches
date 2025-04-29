import * as core from '@actions/core'
import {BranchResponse} from '../types/branches'
import {github, owner, repo} from './get-context'
import {RulesetResponse} from '../types/github-api'

/**
 * Removes branches that don´t allow deletions
 */
export async function checkBranchProtection(branches: BranchResponse[]): Promise<void> {
  const branchesToRemove: BranchResponse[] = []

  for (const branch of branches) {
    try {
      core.info(`Checking branch protection for branch: ${branch.branchName}`)

      // Check legacy branch protection
      const branchProtection = await github.rest.repos.getBranchProtection({
        owner,
        repo,
        branch: branch.branchName
      })

      core.info(`Legacy protection for ${branch.branchName}: allow_deletions=${branchProtection.data.allow_deletions?.enabled}`)

      // Check rulesets
      const rulesets = (await github.rest.repos.getBranchRules({
        owner,
        repo,
        branch: branch.branchName
      })) as RulesetResponse

      core.info(`Rulesets for ${branch.branchName}: ${JSON.stringify(rulesets.data, null, 2)}`)

      // If either legacy protection or rulesets prevent deletion, remove the branch
      if (!branchProtection.data.allow_deletions?.enabled || rulesets.data.some(ruleset => !ruleset.deletion)) {
        core.info(`Branch ${branch.branchName} will be removed due to protection rules`)
        branchesToRemove.push(branch)
      } else {
        core.info(`Branch ${branch.branchName} allows deletions`)
      }
    } catch (err) {
      if (err instanceof Error) {
        // Check if the error is due to branch not being protected
        if (err.message.includes('Branch not protected')) {
          core.info(`Branch ${branch.branchName} is not protected - allowing deletion`)
          // Don't add to branchesToRemove since unprotected branches can be deleted
        } else {
          core.info(`Failed to retrieve branch protection for branch ${branch.branchName}. Error: ${err.message}`)
          // Keep the branch in the list if we can't determine its protection status
        }
      } else {
        core.info(`Failed to retrieve branch protection for branch ${branch.branchName}.`)
        // Keep the branch in the list if we can't determine its protection status
      }
    }
  }

  // remove branches that don´t allow deletions
  for (const branch of branchesToRemove) {
    const index = branches.indexOf(branch, 0)
    if (index > -1) {
      branches.splice(index, 1)
    }
  }
}
