import { StackContext, Api, Config, Function } from "sst/constructs";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";

const layerArn =
  "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:25";

export function API({ stack }: StackContext) {
  const layer = LayerVersion.fromLayerVersionArn(stack, "Layer", layerArn);
 
  const SLACK_BOT_TOKEN = new Config.Secret(stack, "SLACK_BOT_TOKEN");
  const SLACK_SIGNING_SECRET = new Config.Secret(stack, "SLACK_SIGNING_SECRET");
  
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
      "POST /unsubscribe": "packages/functions/src/unsubscribe.handler",
      "GET /donor-report": {
        function: {
          runtime: "nodejs14.x",
          timeout: 15,
          handler: "packages/functions/src/donor-report.handler",
          nodejs: {
            esbuild: {
              external: ["chrome-aws-lambda"],
            },
          },
          layers: [ layer ],
        },
      },

      // dhamma_app_dev slack app
      "POST /slack/events": "packages/functions/src/slack.handler",

      //  "GET /donor-report": "packages/functions/src/donor-report.handler",
    },
  });


   const checkFunction = new Function(stack, "CheckFunction", {
    handler: "packages/functions/src/check.main",
    timeout: 20,
  });

  checkFunction.bind([SLACK_BOT_TOKEN])

  api.bind([SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET]);
  api.attachPermissionsToRoute("POST /slack/events", ["sqs"]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
