import * as core from '@actions/core'
import {BranchResponse} from '../types/branches'
import {github, owner, repo} from './get-context'
import {RulesetResponse} from '../types/github-api'
import {RequestError} from '@octokit/request-error'

/**
 * Removes branches that don´t allow deletions
 */
export async function checkBranchProtection(branches: BranchResponse[]): Promise<void> {
  const branchesToRemove: BranchResponse[] = []

  for (const branch of branches) {
    core.info(`Checking branch protection for branch: ${branch.branchName}`)

    let hasBranchProtection = false
    let branchProtectionAllowsDeletion = false
    let hasRulesetProtection = false
    let rulesetAllowsDeletion = false

    // Check branch protection
    try {
      const branchProtection = await github.rest.repos.getBranchProtection({
        owner,
        repo,
        branch: branch.branchName
      })

      hasBranchProtection = true
      branchProtectionAllowsDeletion = branchProtection.data.allow_deletions?.enabled ?? false
      core.info(`Branch protection for ${branch.branchName}: allow_deletions=${branchProtectionAllowsDeletion}`)
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        core.info(`Branch ${branch.branchName} has no branch protection (404)`)
      } else if (err instanceof Error) {
        core.info(`Failed to retrieve branch protection for branch ${branch.branchName}. Error: ${err.message}`)
      } else {
        core.info(`Failed to retrieve branch protection for branch ${branch.branchName}.`)
      }
    }

    // Check rulesets
    try {
      const rulesets = (await github.rest.repos.getBranchRules({
        owner,
        repo,
        branch: branch.branchName
      })) as RulesetResponse

      hasRulesetProtection = rulesets.data.length > 0
      rulesetAllowsDeletion = !rulesets.data.some(ruleset => !ruleset.deletion)
      core.info(`Rulesets for ${branch.branchName}: ${JSON.stringify(rulesets.data, null, 2)}`)
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        core.info(`Branch ${branch.branchName} has no ruleset protection (404)`)
      } else if (err instanceof Error) {
        core.info(`Failed to retrieve rulesets for branch ${branch.branchName}. Error: ${err.message}`)
      } else {
        core.info(`Failed to retrieve rulesets for branch ${branch.branchName}.`)
      }
    }

    // If either protection system prevents deletion, remove the branch
    if ((hasBranchProtection && !branchProtectionAllowsDeletion) || (hasRulesetProtection && !rulesetAllowsDeletion)) {
      core.info(`Branch ${branch.branchName} will be removed due to protection rules`)
      branchesToRemove.push(branch)
    } else {
      core.info(`Branch ${branch.branchName} allows deletions (branch protection: ${hasBranchProtection}, ruleset: ${hasRulesetProtection})`)
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
