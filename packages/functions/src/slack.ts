import { App, AwsLambdaReceiver } from "@slack/bolt";
import { LogLevel } from "@slack/logger";
import { registerListeners } from "@urd/core/src/slack-app-listeners/listeners";
import {
  AwsEvent,
  AwsCallback,
} from "@slack/bolt/dist/receivers/AwsLambdaReceiver";
import { Config } from "sst/node/config";

console.log("slack signing secret", Config.SLACK_SIGNING_SECRET);

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: Config.SLACK_SIGNING_SECRET as string,
});


// TODO: there is no currently SLACK_LOG_LEVEL config
const logLevel = (process.env.SLACK_LOG_LEVEL as LogLevel) || LogLevel.INFO;

const app = new App({
  logLevel,
  token: Config.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

registerListeners(app);

export async function handler(
  event: AwsEvent,
  context: any,
  callback: AwsCallback
) {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
}
