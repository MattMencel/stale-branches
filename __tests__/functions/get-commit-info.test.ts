import {getRecentCommitInfo} from '../../src/functions/get-commit-info'

const mockCommits = [
  {
    commit: {message: 'WIP: temp', committer: {date: '2023-01-01T00:00:00Z'}, author: {name: 'Alice'}},
    committer: {login: 'alice'},
    author: {login: 'alice'}
  },
  {
    commit: {message: 'fix: bug', committer: {date: '2023-01-02T00:00:00Z'}, author: {name: 'Bob'}},
    committer: {login: 'bob'},
    author: {login: 'bob'}
  },
  {
    commit: {message: 'feat: add feature', committer: {date: '2023-01-03T00:00:00Z'}, author: {name: 'Carol'}},
    committer: {login: 'carol'},
    author: {login: 'carol'}
  }
]

describe('getRecentCommitInfo', () => {
  let githubBackup: any
  beforeAll(() => {
    githubBackup = require('../../src/functions/get-context').github
  })
  afterAll(() => {
    require('../../src/functions/get-context').github = githubBackup
  })
  beforeEach(() => {
    require('../../src/functions/get-context').github = {
      rest: {
        repos: {
          listCommits: jest.fn().mockResolvedValue({data: mockCommits})
        }
      }
    }
  })

  it('ignores commits by message', async () => {
    const result = await getRecentCommitInfo('sha', ['WIP'], undefined, [])
    expect(result.committer).toBe('bob')
    expect(result.ignoredCount).toBe(1)
  })

  it('ignores commits by committer', async () => {
    const result = await getRecentCommitInfo('sha', [], undefined, ['alice'])
    expect(result.committer).toBe('bob')
    expect(result.ignoredCount).toBe(1)
  })

  it('ignores commits by both message and committer', async () => {
    const result = await getRecentCommitInfo('sha', ['fix'], undefined, ['alice'])
    expect(result.committer).toBe('carol')
    expect(result.ignoredCount).toBe(2)
  })

  it('returns first commit if no ignores match', async () => {
    const result = await getRecentCommitInfo('sha', [], undefined, [])
    expect(result.committer).toBe('alice')
    expect(result.ignoredCount).toBe(0)
  })
})
