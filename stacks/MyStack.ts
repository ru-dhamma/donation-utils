import { StackContext, Api, Queue, Config, toCdkDuration } from "sst/constructs";

export function API({ stack }: StackContext) {
  const SLACK_BOT_TOKEN = new Config.Secret(stack, "SLACK_BOT_TOKEN");
  const SLACK_SIGNING_SECRET = new Config.Secret(stack, "SLACK_SIGNING_SECRET");

  const DATABASE_NAME = new Config.Secret(stack, "DATABASE_NAME");
  const DATABASE_HOST = new Config.Secret(stack, "DATABASE_HOST");
  const DATABASE_USER = new Config.Secret(stack, "DATABASE_USER");
  const DATABASE_PASSWORD = new Config.Secret(stack, "DATABASE_PASSWORD");
  const dbCredentials = [DATABASE_NAME, DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD];

  const PDF_ENDPOINT_API_KEY = new Config.Secret(stack, "PDF_ENDPOINT_API_KEY");

  const api = new Api(stack, "api", {
    routes: {
      /*
       * This just checks that API is working.
       */
      "GET /": "packages/functions/src/lambda.handler",

      /*
       * This is used to get the list of donations that need to be unsubscribed.
       * TODO: there is no need to expose this api endpoint.
       */
      "POST /unsubscribe": "packages/functions/src/unsubscribe.handler",

      /*
       * Get html version of donation report.
       */
      "GET /donor-report": {
        function: {
          timeout: 15,
          handler: "packages/functions/src/donor-report.handler",
        },
      },

      /*
       * This endpoint is added to Slack bot configuration. Once an event happens
       * in Slack, this endpoint is triggered.
       */
      "POST /slack/events": "packages/functions/src/slack.handler",
    },
  });

  const checkOrSyncDbQueue = new Queue(stack, "CheckOrSyncDbQueue", {
    cdk: {
      queue: {
        receiveMessageWaitTime: toCdkDuration('20 seconds')
      }
    },
    consumer: {
      function: {
        timeout: 60,
        handler: "packages/functions/src/checkOrSyncDb.main",
      },
    },
  });
  checkOrSyncDbQueue.bind([SLACK_BOT_TOKEN, ...dbCredentials]);

  const handleDonationsReportQueue = new Queue(
    stack,
    "HandleDonationsReportQueue",
    {
      cdk: {
        queue: {
          receiveMessageWaitTime: toCdkDuration('20 seconds')
        }
      },
      consumer: {
        function: {
          timeout: 60,
          handler: "packages/functions/src/handleDonationsReport.main",
        },
      },
    }
  );
  handleDonationsReportQueue.bind([SLACK_BOT_TOKEN, PDF_ENDPOINT_API_KEY, ...dbCredentials]);

  api.bind([
    checkOrSyncDbQueue,
    handleDonationsReportQueue,
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    ...dbCredentials,
  ]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
