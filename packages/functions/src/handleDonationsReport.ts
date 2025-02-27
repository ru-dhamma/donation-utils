import axios from "axios";
import { DateTime } from "luxon";
import {
  buildCsvStringForBookkeeper,
  buildPdfLink,
} from "@urd/core/donation-report";
import { slackClient } from "@urd/core/slackClient";
import { Config } from "sst/node/config";

export interface SqsEvent {
  Records: Record[];
}

interface Record {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: Attributes;
  messageAttributes: MessageAttributes;
  md5OfBody: string;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}

interface Attributes {
  ApproximateReceiveCount: string;
  SentTimestamp: string;
  SenderId: string;
  ApproximateFirstReceiveTimestamp: string;
}

interface MessageAttributes { }

type DonationReportEvent = {
  from: string;
  to: string;
  channel: string;
  slackUid: string;
};

export async function main(event: SqsEvent) {
  const records = event.Records;
  for (const record of records) {
    const payload = JSON.parse(record.body) as DonationReportEvent;
    await handleMessage(payload);
  }
}

async function handleMessage(event: DonationReportEvent) {
  console.log("handleDonationsReport event", JSON.stringify(event));

  const from = DateTime.fromISO(event.from);
  const to = DateTime.fromISO(event.to);

  const pdfLink = await buildPdfLink(from, to);

  const pdf = await downloadFile(pdfLink);

  const period = from.month === to.month ? from.toFormat('yyyy-MM') : from.toFormat('yyyy');

  const res = await slackClient(Config.SLACK_BOT_TOKEN).files.upload({
    filename: `donations_${period}.pdf`,
    initial_comment: "Here is the report.",
    title: "Online Donations at Dhamma Dullabha",
    filetype: "pdf",
    file: pdf,
    channels: event.slackUid,
  });

  const csvStringForBookkeeper = await buildCsvStringForBookkeeper(from, to);

  const resBookkeeperCsv = await slackClient(
    Config.SLACK_BOT_TOKEN
  ).files.uploadV2({
    filename: `donations_${period}.csv`,
    initial_comment: "Here is CSV file for bookkeeper!",
    title: "Donations List for Bookkeeper",
    filetype: "csv",
    content: csvStringForBookkeeper,
    // channels: event.slackUid,
    channel_id: event.channel,
  });

  console.log("pdf file upload response", res);
  console.log("csv file upload response", resBookkeeperCsv);
}

const downloadFile = async (url: string) => {
  const response = await axios.get(url, {
    // See https://axios-http.com/docs/api_intro
    responseType: "stream",
  });
  const pdfContents = response.data;
  return pdfContents;
};
