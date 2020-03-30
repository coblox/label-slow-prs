import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import moment from 'moment'
import business from 'moment-business'

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', {required: true})
    const client = new GitHub(token)
    const pulls = await client.pulls.list(context.repo)

    const recentPulls = pulls.data.filter(pull => {
      const now = moment()
      const createdAt = moment(pull.created_at)
      const twoWeeksAgo = now.subtract(2, 'weeks').startOf('day')

      return createdAt.isAfter(twoWeeksAgo)
    })

    const oldPulls = recentPulls.filter(pull => {
      const createdAt = moment(pull.created_at)
      const closedAt = !!pull.closed_at ? moment(pull.closed_at) : moment()
      const weekdaysOpen = business.weekDays(createdAt, closedAt)

      return weekdaysOpen >= 3
    })

    for (const pull of oldPulls) {
      const issue_number = pull.number
      const owner = pull.head.user.login
      const repo = pull.head.repo.name
      client.issues.addLabels({
        labels: ['3-days-old'],
        issue_number,
        owner,
        repo
      })
      core.debug(
        `Labelled issue #${issue_number} in repo ${owner}/${repo} as 3-days-old`
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
