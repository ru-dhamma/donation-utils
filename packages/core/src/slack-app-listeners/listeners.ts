import { App } from "@slack/bolt";
import axios from "axios";
import { Config } from "sst/node/config";
// import * as customMiddleware from "./customMiddleware";

export function registerListeners(app: App) {
  //   customMiddleware.enableAll(app);

  // Listens to incoming messages that contain "hello"
  app.message("check", async ({ body, message, say, ack }) => {
    const myMessage = message as any;

    await say("check got!");

    // Filter out message events with subtypes (see https://api.slack.com/events/message)
    if (message.subtype === undefined || message.subtype === "file_share") {
      if (
        myMessage.files &&
        Array.isArray(myMessage.files) &&
        myMessage.files.length > 0
      ) {
        const file = myMessage.files[0];
        console.log("passing to axios", file.url_private);
        const fileDowloadResponse = await axios.get(file.url_private, {
          headers: {
            Authorization: "Bearer " + Config.SLACK_BOT_TOKEN,
          },
        });

        const csvString = fileDowloadResponse.data;

        await say("you sent me a file!");

        // console.log('csvString', fileDowloadResponse.data)
      }

      // check if message contains csv file
      //
      // check for incorrect donation statuses
      //
      // send incorrect statuses
    }
  });
}
