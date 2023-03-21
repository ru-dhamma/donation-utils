import { StackContext, Api, Function } from "sst/constructs";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";

const layerArn =
  "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:25";

export function API({ stack }: StackContext) {
  const layer = LayerVersion.fromLayerVersionArn(stack, "Layer", layerArn);
  
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

      //  "GET /donor-report": "packages/functions/src/donor-report.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
