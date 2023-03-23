import { App } from "@slack/bolt";
import axios from "axios";
import { Config } from "sst/node/config";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqsClient = new SQSClient({ region: "us-east-1" });

// import * as customMiddleware from "./customMiddleware";

export function registerListeners(app: App) {
  //   customMiddleware.enableAll(app);


  app.message("sync", async ({ body, message, say, ack }) => {
    const myMessage = message as any;
    const myBody = body as any;

    const slackUid = myBody.event.user;

    await say('This is not implemented yet. Check back a later.')

    if (message.subtype === undefined || message.subtype === "file_share") {
      if (
        myMessage.files &&
        Array.isArray(myMessage.files) &&
        myMessage.files.length > 0
      ) {
        const file = myMessage.files[0];
        const fileDowloadResponse = await axios.get(file.url_private, {
          headers: {
            Authorization: "Bearer " + Config.SLACK_BOT_TOKEN,
          },
        });

        const csvString = fileDowloadResponse.data;

        await say("Got it! I'll check with database and will send the report once it's ready.");

        const params = {
          // DelaySeconds: 10,
          // MessageAttributes: {
          //   Author: {
          //     DataType: "String",
          //     StringValue: "Preeti",
          //   }
          // },
          MessageBody: JSON.stringify(
            {
              slackUid,
              csvString,
              command: 'sync'
            }),
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/027546143534/course-organizer"
        };
      
      
        try {
          const data = await sqsClient.send(new SendMessageCommand(params));
          if (data) {
            console.log("Success, message sent. MessageID:", data.MessageId);
            const bodyMessage = 'Message Send to SQS- Here is MessageId: ' +data.MessageId;

            console.log('all good', bodyMessage)
          }else{
            console.log('error:')
          }
        }
        catch (err) {
          console.log("Error", err);
        }
      }
    }
  });

  // Listens to incoming messages that contain "hello"
  app.message("check", async ({ body, message, say, ack }) => {
    const myMessage = message as any;
    const myBody = body as any;

    const slackUid = myBody.event.user;

    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    if (message.subtype === undefined || message.subtype === "file_share") {
      if (
        myMessage.files &&
        Array.isArray(myMessage.files) &&
        myMessage.files.length > 0
      ) {
        const file = myMessage.files[0];
        const fileDowloadResponse = await axios.get(file.url_private, {
          headers: {
            Authorization: "Bearer " + Config.SLACK_BOT_TOKEN,
          },
        });

        const csvString = fileDowloadResponse.data;

        await say("Got it! I'll check with database and will send the report once it's ready.");


        const params = {
          // DelaySeconds: 10,
          // MessageAttributes: {
          //   Author: {
          //     DataType: "String",
          //     StringValue: "Preeti",
          //   }
          // },

          MessageBody: JSON.stringify(
            {
              slackUid,
              csvString,
              command: 'check'
            }),
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/027546143534/course-organizer"
        };
      
      
        try {
          const data = await sqsClient.send(new SendMessageCommand(params));
          if (data) {
            console.log("Success, message sent. MessageID:", data.MessageId);
            const bodyMessage = 'Message Send to SQS- Here is MessageId: ' +data.MessageId;

            console.log('all good', bodyMessage)
          }else{
            console.log('error:')
          }
        }
        catch (err) {
          console.log("Error", err);
        }
      }
    }
  });
}
