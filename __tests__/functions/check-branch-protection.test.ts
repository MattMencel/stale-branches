import {BranchResponse} from '../../src/types/branches'
import {github} from '../../src/functions/get-context'
import {checkBranchProtection} from '../../src/functions/check-branch-protection'
import {RulesetResponse} from '../../src/types/github-api'

function createBranchTestData() {
  const branches: BranchResponse[] = [
    {branchName: 'branch1', commmitSha: '12345'},
    {branchName: 'branch2', commmitSha: '67890'}
  ]
  return branches
}

describe('Check Branch Protection Function', () => {
  let branches: BranchResponse[]

  beforeEach(() => {
    jest.clearAllMocks()
    branches = createBranchTestData()
  })

  it('removes branches that do not allow deletions via legacy protection', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: false}}})
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest.fn().mockResolvedValueOnce({data: []}).mockResolvedValueOnce({data: []}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([{branchName: 'branch2', commmitSha: '67890'}])
  })

  it('removes branches that do not allow deletions via rulesets', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}})
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest
      .fn()
      .mockResolvedValueOnce({data: [{type: 'deletion', deletion: false}]})
      .mockResolvedValueOnce({data: []}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([{branchName: 'branch2', commmitSha: '67890'}])
  })

  it('keeps branches that allow deletions in both systems', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}})
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest.fn().mockResolvedValueOnce({data: []}).mockResolvedValueOnce({data: []}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([
      {branchName: 'branch1', commmitSha: '12345'},
      {branchName: 'branch2', commmitSha: '67890'}
    ])
  })

  it('handles errors when retrieving branch protection', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error retrieving branch protection'))
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest.fn().mockResolvedValueOnce({data: []}).mockResolvedValueOnce({data: []}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([
      {branchName: 'branch1', commmitSha: '12345'},
      {branchName: 'branch2', commmitSha: '67890'}
    ])
  })

  it('handles errors when retrieving rulesets', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}})
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: true}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest.fn().mockRejectedValueOnce(new Error('Error retrieving rulesets')).mockResolvedValueOnce({data: []}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([
      {branchName: 'branch1', commmitSha: '12345'},
      {branchName: 'branch2', commmitSha: '67890'}
    ])
  })

  it('removes multiple branches that do not allow deletions in either system', async () => {
    github.rest.repos.getBranchProtection = jest
      .fn()
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: false}}})
      .mockResolvedValueOnce({data: {allow_deletions: {enabled: false}}}) as unknown as typeof github.rest.repos.getBranchProtection

    github.rest.repos.getBranchRules = jest
      .fn()
      .mockResolvedValueOnce({data: [{type: 'deletion', deletion: false}]})
      .mockResolvedValueOnce({data: [{type: 'deletion', deletion: false}]}) as unknown as typeof github.rest.repos.getBranchRules

    await checkBranchProtection(branches)

    expect(branches).toEqual([])
  })
})
