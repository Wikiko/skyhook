import { Embed } from '../model/Embed'
import { BaseProvider } from '../provider/BaseProvider'

/**
 * https://developer.atlassian.com/server/jira/platform/webhooks/
 */
class Jira extends BaseProvider {
    constructor() {
        super()
        this.setEmbedColor(0x1e45a8)
    }

    public getName(): string {
        return 'Jira'
    }

    public getPath(): string {
        return 'jira'
    }

    private isTransition() {
        return this.body.transition != null
    }

    private getIssue() {
        const issue = this.body.issue
        if (issue.fields.assignee == null) {
            issue.fields.assignee = {displayName: 'nobody'}
        }
        return issue
    }

    private getUser(){
        return this.body.user || { displayName: 'Anonymous' }
    }

    private getDomainFromIssue(issue) {
        const matches = issue.self.match(/^(https?:\/\/[^/?#]+)(?:[/?#]|$)/i)
        return matches && matches[1]
    }

    private parseTransition(){
        const issue = this.getIssue()
        const user = this.getUser()
        const domain = this.getDomainFromIssue(issue)

        const transition = this.body.transition
        const embed = new Embed()
        embed.title = `${issue.key} - ${issue.fields.summary}`
        embed.url = `${domain}/browse/${issue.key}`
        embed.description = `${user.displayName} moveu de ${transition.from_status} para ${transition.to_status}`
        this.addEmbed(embed)
    }

    private parseWebhookEvent() {
        if (this.body.webhookEvent == null) {
            this.payload = null
            return
        }

        let isIssue: boolean
        if (this.body.webhookEvent.startsWith('jira:issue_')) {
            isIssue = true
        } else if (this.body.webhookEvent.startsWith('comment_')) {
            isIssue = false
        } else {
            return
        }

        // extract variable from Jira
        const issue = this.getIssue()
        const user = this.getUser()
        const action = this.body.webhookEvent.split('_')[1]
        const domain = this.getDomainFromIssue(issue)

        // create the embed
        const embed = new Embed()
        embed.title = `${issue.key} - ${issue.fields.summary}`
        embed.url = `${domain}/browse/${issue.key}`
        if (isIssue) {
            embed.description = `${user.displayName} ${action} issue: ${embed.title} (${issue.fields.assignee.displayName})`
        } else {
            const comment = this.body.comment
            embed.description = `${comment.updateAuthor.displayName} ${action} comment: ${comment.body}`
        }
        this.addEmbed(embed)
    }

    public async parseData(): Promise<void> {
        if (this.isTransition()) {
            this.parseTransition()
            return
        }
        this.parseWebhookEvent()
    }
}

export { Jira }
