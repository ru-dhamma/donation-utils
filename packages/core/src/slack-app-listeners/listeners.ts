import { App } from "@slack/bolt";
import axios from "axios";
import { DateTime } from "luxon";
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
    const channel = myBody.event.channel;

    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    if (message.subtype === undefined) {
      let from: DateTime = DateTime.now().startOf('month').startOf('day');
      let to: DateTime = DateTime.now().endOf('day');

      const messageRegex = /report\s+for\s+(\d{4})(?:-(\d{1,2}))?/i;
      const text = message.text ? message.text : "";
      if (!messageRegex.test(text)) {
        await say("Looks like you want the donations report. To get this report, send me something like `report for 2023-03`");
        return;
      }
      const match = text.match(messageRegex) as string[];
      let year = match[1] ?? null;
      let month = match[2] ?? null;
      if (year) {
        if (month) {
          // Monthly report
          from = DateTime.fromISO(`${year}-${month}`).startOf('month').startOf('day');
          to = from.endOf('month').endOf('day');
        } else {
          // Yearly report
          from = DateTime.fromISO(year).startOf('year').startOf('day');
          to = from.endOf('year').endOf('day');
        }
      }

      await say("Preparing the report...");

      const params = {
        MessageBody: JSON.stringify({
          slackUid,
          channel,
          from: from.toISO(),
          to: to.toISO(),
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
