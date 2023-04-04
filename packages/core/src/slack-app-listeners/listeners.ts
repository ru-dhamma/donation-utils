import { App } from "@slack/bolt";
import axios from "axios";
import { Config } from "sst/node/config";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";
const sqsClient = new SQSClient({ region: "us-east-1" });

// import * as customMiddleware from "./customMiddleware";

export function registerListeners(app: App) {
  //   customMiddleware.enableAll(app);

  app.message("sync", async ({ body, message, say, ack }) => {
    console.log("sync message and body", message, body);
    const myMessage = message as any;
    const myBody = body as any;

    const slackUid = myBody.event.user;

    if (message.subtype === undefined || message.subtype === "file_share") {
      if (
        myMessage.files &&
        Array.isArray(myMessage.files) &&
        myMessage.files.length > 0
      ) {
        const file = myMessage.files[0];
        const fileDownloadResponse = await axios.get(file.url_private, {
          headers: {
            Authorization: "Bearer " + Config.SLACK_BOT_TOKEN,
          },
        });

        const csvString = fileDownloadResponse.data;

        const arr = csvString.split(/[\r\n]+/);

        await say(`Syncing ${arr.length - 2} rows...`);

        const params = {
          MessageBody: JSON.stringify({
            slackUid,
            csvString,
            command: "sync",
          }),
          QueueUrl: Queue.CheckOrSyncDbQueue.queueUrl,
        };

        try {
          const data = await sqsClient.send(new SendMessageCommand(params));
          if (data) {
            console.log("Success, message sent. MessageID:", data.MessageId);
            const bodyMessage =
              "Message Send to SQS- Here is MessageId: " + data.MessageId;

            console.log("all good", bodyMessage);
          } else {
            console.log("error:");
          }
        } catch (err) {
          console.log("Error", err);
        }
      }
    }
  });

  app.message("check", async ({ body, message, say, ack }) => {
    console.log("check message and body", message, body);
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
        const fileDownloadResponse = await axios.get(file.url_private, {
          headers: {
            Authorization: "Bearer " + Config.SLACK_BOT_TOKEN,
          },
        });

        const csvString = fileDownloadResponse.data;

        const arr = csvString.split(/[\r\n]+/);

        await say(`Checking ${arr.length - 2} rows...`);

        const params = {
          // DelaySeconds: 10,
          // MessageAttributes: {
          //   Author: {
          //     DataType: "String",
          //     StringValue: "Preeti",
          //   }
          // },

          MessageBody: JSON.stringify({
            slackUid,
            csvString,
            command: "check",
          }),
          QueueUrl: Queue.CheckOrSyncDbQueue.queueUrl,
        };

        try {
          const data = await sqsClient.send(new SendMessageCommand(params));
          if (data) {
            console.log("Success, message sent. MessageID:", data.MessageId);
            const bodyMessage =
              "Message Send to SQS- Here is MessageId: " + data.MessageId;

            console.log("all good", bodyMessage);
          } else {
            console.log("error:");
          }
        } catch (err) {
          console.log("Error", err);
        }
      }
    }
  });

  app.message("report", async ({ client, body, message, say, ack }) => {
    console.log("check message and body", message, body);
    const myBody = body as any;

    const slackUid = myBody.event.user;

    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    if (message.subtype === undefined) {
      let from = new Date();
      let to = new Date();

      let fromStr = "";
      let toStr = "";

      const messageRegex =
        /report\sfrom\s(\d\d\d\d\-\d\d\-\d\d) to (\d\d\d\d\-\d\d\-\d\d)/i;
      const text = message.text ? message.text : "";
      if (messageRegex.test(text)) {
        const match = text.match(messageRegex) as string[];
        fromStr = match[1];
        toStr = match[2];
        from = new Date(fromStr);
        to = new Date(toStr);
      } else {
        await say(
          "Looks like you want the donations report. To get this report, send me something like `report from 2023-01-01 to 2023-01-31`"
        );
        return;
      }

      await say("Preparing the report...");

      const params = {
        MessageBody: JSON.stringify({
          slackUid,
          from,
          to,
        }),
        QueueUrl: Queue.HandleDonationsReportQueue.queueUrl,
      };

      try {
        const data = await sqsClient.send(new SendMessageCommand(params));
        if (data) {
          console.log("Success, message sent. MessageID:", data.MessageId);
          const bodyMessage =
            "Message Send to SQS- Here is MessageId: " + data.MessageId;

          console.log("all good", bodyMessage);
        } else {
          console.log("error:");
        }
      } catch (err) {
        console.log("Error", err);
      }
    }
  });
}
