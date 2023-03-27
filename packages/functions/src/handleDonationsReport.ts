import axios from 'axios';
import { buildPdfLink } from "@urd/core/donation-report";
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

  console.log('file upload response', res);
}

const downloadFile = async (url: string) => {
  const response = await axios.get(url, {
    // See https://axios-http.com/docs/api_intro
    responseType: "stream",
  });
  const pdfContents = response.data;
  return pdfContents;
};
