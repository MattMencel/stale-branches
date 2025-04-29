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
    core.info(`\nChecking protections for branch: ${branch.branchName}`)

    let hasBranchProtection = false
    let branchProtectionAllowsDeletion = false
    let hasRulesetProtection = false
    let rulesetAllowsDeletion = false

    // Check branch protection
    try {
      core.info(`Checking branch protection...`)
      const branchProtection = await github.rest.repos.getBranchProtection({
        owner,
        repo,
        branch: branch.branchName
      })

      hasBranchProtection = true
      branchProtectionAllowsDeletion = branchProtection.data.allow_deletions?.enabled ?? false
      core.info(`Branch protection status: allow_deletions=${branchProtectionAllowsDeletion}`)
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        core.info(`Branch protection: No protection rules found (404)`)
      } else if (err instanceof Error) {
        core.info(`Branch protection check failed: ${err.message}`)
      } else {
        core.info(`Branch protection check failed: Unknown error`)
      }
    }

    // Check rulesets
    try {
      core.info(`Checking rulesets...`)
      const rulesets = (await github.rest.repos.getBranchRules({
        owner,
        repo,
        branch: branch.branchName
      })) as RulesetResponse

      hasRulesetProtection = rulesets.data.length > 0
      rulesetAllowsDeletion = !rulesets.data.some(ruleset => !ruleset.deletion)
      core.info(`Rulesets found: ${rulesets.data.length}`)
      if (rulesets.data.length > 0) {
        core.info(`Ruleset details: ${JSON.stringify(rulesets.data, null, 2)}`)
      }
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        core.info(`Rulesets: No rules found (404)`)
      } else if (err instanceof Error) {
        core.info(`Ruleset check failed: ${err.message}`)
      } else {
        core.info(`Ruleset check failed: Unknown error`)
      }
    }

    // If either protection system prevents deletion, remove the branch
    if ((hasBranchProtection && !branchProtectionAllowsDeletion) || (hasRulesetProtection && !rulesetAllowsDeletion)) {
      core.info(`❌ Branch ${branch.branchName} will be removed due to protection rules`)
      branchesToRemove.push(branch)
    } else {
      core.info(`✅ Branch ${branch.branchName} allows deletions (branch protection: ${hasBranchProtection}, ruleset: ${hasRulesetProtection})`)
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
