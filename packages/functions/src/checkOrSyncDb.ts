import { connection } from "@urd/core/db";
import {slackClient} from '@urd/core/slackClient'
import {csvParse} from "@urd/core/csv"
import { Config } from "sst/node/config";


export interface SqsEvent {
    Records: Record[]
  }
  
   interface Record {
    messageId: string
    receiptHandle: string
    body: string
    attributes: Attributes
    messageAttributes: MessageAttributes
    md5OfBody: string
    eventSource: string
    eventSourceARN: string
    awsRegion: string
  }
  
 interface Attributes {
    ApproximateReceiveCount: string
    SentTimestamp: string
    SenderId: string
    ApproximateFirstReceiveTimestamp: string
  }
  
 interface MessageAttributes {}
  

export interface YookassaCsvRow {
    "Дата создания заказа в ЮKassa": string
    "Дата платежа": string
    "Идентификатор платежа": string
    "Статус платежа": string
    "Сумма платежа": string
    "Сумма к зачислению": string
    "Валюта": string
    "Описание заказа": string
    "Номер заказа в системе клиента": string
    "Метод платежа": string
    "Код метода платежа": string
    "Сумма возврата по платежу": string
    "Дата возврата (если возвратов несколько — последнего)": string
    "RRN операции": string
    "Номер карты плательщика": string
    "Статус авторизации": string
    "Код articleId": string
    "Имя articleId": string
  }

export type DonationDataRow = {
  id: number;
  user_id: number;
  status: "paid" | "new";
  amount: string;
  created_at: Date;
  is_automatic: number;
  is_rebilling: number;
};

type CheckEvent = {
    csvString: string;
    slackUid: string;
    command: 'sync' | 'check';
}


export async function main(event: SqsEvent) {
    const records = event.Records;
    for (const record of records) {
        const payload = JSON.parse(record.body) as CheckEvent;
        await handleMessage(payload);
    }
}

async function handleMessage(event: CheckEvent) {

    // console.log('event looks like this:', event);

    const yookassaPayments = csvParse(event.csvString) as YookassaCsvRow[];

    const donationsThatNeedSyncing: DonationDataRow[] = []

    for (const yookassaPayment of yookassaPayments) {
        const [rows] = await connection().query(`select * from donations where payment_instruction_id = ${yookassaPayment['Номер заказа в системе клиента']}`)

        const donRows = rows as unknown as DonationDataRow[];

        // I assume rows array should always return an array with only one element
        const donation = donRows[0]

        if (donation.status === 'new' && yookassaPayment['Статус платежа'] === 'Оплачен') {
            donationsThatNeedSyncing.push(donation)
        }
    }

    const res = await slackClient(Config.SLACK_BOT_TOKEN).chat.postMessage({
        text: 'Here is the list of donations with invalid status: \n' + donationsThatNeedSyncing.map(el => `• ID: ${el.id}, amount: ${parseInt(el.amount)} ₽, status: ${el.status}, isAutomatic: ${el.is_automatic} created_at: ${el.created_at}`,).join('\n') + '\n\nTo make changes to database, send again this file, now with `sync` text.',
        channel: event.slackUid
    });

    return {
      donationsThatNeedSyncingCount: donationsThatNeedSyncing.length,
      donationsThatNeedSyncing,
    };
  }
