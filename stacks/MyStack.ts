import { StackContext, Api, Queue, Config, Function } from "sst/constructs";

export function API({ stack }: StackContext) {
 
  const SLACK_BOT_TOKEN = new Config.Secret(stack, "SLACK_BOT_TOKEN");
  const SLACK_SIGNING_SECRET = new Config.Secret(stack, "SLACK_SIGNING_SECRET");
  
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
      "POST /unsubscribe": "packages/functions/src/unsubscribe.handler",
      "GET /donor-report": {
        function: {
          timeout: 15,
          handler: "packages/functions/src/donor-report.handler",
        },
      },
      // dhamma_app_dev slack app
      "POST /slack/events": "packages/functions/src/slack.handler",
    },
  });

  const checkOrSyncDbQueue = new Queue(stack, "CheckOrSyncDbQueue", {
    consumer: "packages/functions/src/checkOrSyncDb.main",
  });
  checkOrSyncDbQueue.bind([SLACK_BOT_TOKEN]);

  const handleDonationsReportQueue = new Queue(stack, "HandleDonationsReportQueue", {
    consumer: "packages/functions/src/handleDonationsReport.main",
  });
  handleDonationsReportQueue.bind([SLACK_BOT_TOKEN]);

  api.bind([checkOrSyncDbQueue, handleDonationsReportQueue, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET]);
  
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
