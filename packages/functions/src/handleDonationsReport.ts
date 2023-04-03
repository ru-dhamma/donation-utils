import axios from "axios";
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

interface MessageAttributes {}

type DonationReportEvent = {
  from: string;
  to: string;
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

  const from = new Date(event.from);
  const to = new Date(event.to);

  const pdfLink = await buildPdfLink(from, to);

  const pdf = await downloadFile(pdfLink);

  const res = await slackClient(Config.SLACK_BOT_TOKEN).files.upload({
    filename: `donations-report-from-${event.from}-to-${event.to}.pdf`,
    initial_comment: "Here is the report.",
    title: "Online Donations at Dhamma Dullabha",
    filetype: "pdf",
    file: pdf,
    channels: event.slackUid,
  });

  const csvStringForBookeeper = await buildCsvStringForBookkeeper(from, to);

  const resBookkeperCsv = await slackClient(
    Config.SLACK_BOT_TOKEN
  ).files.upload({
    filename: `bookkeeper-report-from-${event.from}-to-${event.to}.csv`,
    initial_comment: "Here is CSV file for book keeper.",
    title: "Donations List for Book Keeper",
    filetype: "csv",
    content: csvStringForBookeeper,
    channels: event.slackUid,
  });

  console.log("pdf file upload response", res);
  console.log("csv file upload response", resBookkeperCsv);
}

const downloadFile = async (url: string) => {
  const response = await axios.get(url, {
    // See https://axios-http.com/docs/api_intro
    responseType: "stream",
  });
  const pdfContents = response.data;
  return pdfContents;
};
