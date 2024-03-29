
export * as DonationReport from "./donation-report";
import { DateTime } from "luxon";
import { connection } from "./db";
import { Pdf } from "./pdf";
import { formatMoney, toMoneyValue } from "@urd/functions/src/money";

export type DonationWithUserDataRow = {
  id: number;
  status: "paid" | "new";
  amount: string;
  is_automatic: number;
  is_rebilling: number;
  purpose: string;
  created_at: Date;
  email: string;
};

type DonationByPurposeByMonthRow = {
  create_date_formatted: string;
  amount_total: string;
  purpose: string;
  month: number;
  year: number;
};

export async function buildPdfLink(from: DateTime, to: DateTime) {
  const html = await buildHtml(from, to);

  const pdf = (await Pdf.create(html)).data;

  return pdf.data.url;
}

async function queryDonationRowsWithEmailsFromDb(from: DateTime, to: DateTime) {
  const donationsQuery = `select d.payment_instruction_id as id, d.status, d.amount, d.is_rebilling, d.is_automatic, d.purpose, d.created_at, u.email
      from donations d left join user u on u.id = d.user_id 
      where status = ? and created_at >= ? and created_at <= ?`;

  const [rows] = await connection().query(donationsQuery, [
      'paid',
      from.startOf('day').toSQL(),
      to.endOf('day').toSQL(),
  ]);

  const donRows = rows as unknown as DonationWithUserDataRow[];

  return donRows;
}

export async function buildCsvStringForBookkeeper(from: DateTime, to: DateTime) {
  const donRows = await queryDonationRowsWithEmailsFromDb(from, to);

  const csvString = [
    [
      "ID",
      "Статус платежа",
      "Назначение пожертвования",
      "Сумма в руб",
      "Дата создания",
    ],
    ...donRows.map((item) => [
      item.id,
      item.status,
      item.purpose,
      toMoneyValue(item.amount, 2),
      DateTime.fromJSDate(item.created_at).toFormat('yyyy-MM-dd HH:mm:ss'),
    ]),
  ]
    .map((e) => e.join("\t"))
    .join("\n");

  return csvString;
}

export async function buildHtml(from: DateTime, to: DateTime) {
  const donRows = await queryDonationRowsWithEmailsFromDb(from, to);

  // This SQL query is used for building a chart by purpose by month. A good idea to use this chart in yearly report.
  //
  //   const donationsByPurposeQuery = `
  // 	 SELECT DATE_FORMAT(created_at, '%Y-%m') as create_date_formatted,
  // 	 sum(amount) as amount_total,
  // 	 purpose,
  // 	 month(created_at) as 'month',
  // 	year(created_at) as 'year'
  // FROM donations
  // WHERE
  //   status = ?
  //   and created_at >= ?
  //   and created_at < ?
  // GROUP BY year, month, purpose;
  //   `;
  //   const donationsByPurposeRes = await connection().query(donationsByPurposeQuery, [
  //     'paid',
  //     from.startOf('day').toSQLDate(),
  //     to.endOf('day').toSQLDate(),
  //   ]);
  //   const donationsByPurposeByMonthRows =
  //     donationsByPurposeRes[0] as unknown as DonationByPurposeByMonthRow[];
  const purposesList = [...new Set(donRows.map((el) => el.purpose))];
  // const chartData = buildChartData(donationsByPurposeByMonthRows);

  let html = `

<div style="
    display: flex;
    margin-bottom: 76px;
    margin-top: 20px;
">
    <div style="
    margin: auto;
    display: flex;
    align-items: center;
    gap: 11px;
">
    <span style=" font-size: 1.7em; color: gray; ">Dhamma</span>
    <img src="https://ru.dhamma.org/fileadmin/sys/img/dhammawheel.png" width="53" height="75" alt="Dhamma Wheel">
    <span style=" font-size: 1.7em; color: gray; ">Dullabha</span>
    </div>
  </div>

 
  ${
    /* TODO: This is hacky way to show report period assumes that the report is generated for month only period with [from] as first day of the month and [to] as last day of the month */ ""
  }
  <h1 style="font-size: 2.4em;">Online Donations in ${from.toFormat('MMMM yyyy')}</h1>

  <p style="line-height: 1.6">This is an overview of donations for Dhamma Dullabha collected via <a href="https://donation.dhamma-dullabha.org">online form</a>.</p>
  <br />

  <div>
  ${summaryTableSegmentedByRecurrentAndRegularDonations(donRows)}
  </div>

  <br />
  <br />
  <br />
  <br />
  <br />
  `;

  for (const purpose of purposesList) {
    const oneTimeDonations = donRows.filter(
      (don) => don.purpose === purpose && don.is_automatic === 0
    );
    const recurrentDonations = donRows.filter(
      (don) => don.purpose === purpose && don.is_automatic === 1
    );

    html += `
  <div style="break-before: page;"></div>
  <h2>${capitalizeFirstLetter(purpose.replace(/_/g, " "))}</h2>
<div class="row">
  <div class="column">

  
  <h3>One-Time Donations</h3>
  ${buildDonorsHtmlForPurpose(purpose, oneTimeDonations)}

  </div>
  <div class="column">
  
  <h3>Recurrent Donations</h3>
  ${buildDonorsHtmlForPurpose(purpose, recurrentDonations)}
  
  </div>
</div>
    `;
  }

  html = wrapHtml(html, null);
  // html = wrapHtml(html, chartData);

  // const reportPdf = (await Pdf.create(html)) as Buffer;
  // let response = {
  //   statusCode: 200,
  //   headers: {
  //     "Content-type": "application/pdf", //you can change any content type
  //     "content-disposition": "attachment; filename=report-Jan-2023.pdf", // key of success
  //   },
  //   body: reportPdf.toString("base64"),
  //   isBase64Encoded: true,
  // };
  // return response;

  return html;
}

function buildDonorsHtmlForPurpose(
  purpose: string,
  donations: DonationWithUserDataRow[]
) {
  let result = ``;
  result += `
  <table>
  <tr>
    <th>Date</th>
    <th>Email</th>
    <th style="text-align:right;">Amount</th>
  </tr>
    ${donations
      .map(
        (don) =>
          `<tr> 
            <td>${DateTime.fromJSDate(don.created_at).toFormat('MMM d').replace(" ", "&nbsp;")}</td>  
            <td>${shortenEmail(don.email)}</td>  
            <td style="text-align: right">${moneyValue(don.amount)}</td> 
           </tr>`
      )
      .join("")}
  </table>
  `;
  return result;
}

function wrapHtml(html: string, chartData: any) {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>

body {
  font-family: arial, sans-serif;
  padding-top: 10px;
}

table {
  border-collapse: collapse;
  width: 100%;
}

td, th {
  text-align: left;
  padding: 8px 0;
}

tr {
  border-bottom: 1px solid #ddd;
}

.row {
  display: flex;
  gap: 6%;
}

.column {
  flex: 50%;
}

.wrapper{
  display:block;
  overflow:hidden;
  margin:0 auto;
  background:#fff;
  border-radius:4px;
}

canvas{
  background:#fff;
  height:400px;
}

h1{
  font-weight:400;
  display: block;
  text-decoration: none;
}

</style>
</head>
<body>
  ${html}
</body>
</html>
  `;
}

function capitalizeFirstLetter(str: string) {
  const arr = str.split(" ");

  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }

  return arr.join(" ");
}

function moneyValue(x: number | string): string {
  return formatMoney(x, 0).replaceAll(' ', '&nbsp;');
}

function buildChartData(rows: DonationByPurposeByMonthRow[]) {
  const yearMonths = [...new Set(rows.map((el) => el.create_date_formatted))];

  let purposesList = [...new Set(rows.map((el) => el.purpose))];
  purposesList = [
    ...purposesList.filter((el) => el === "statute_activity"),
    ...purposesList.filter((el) => el !== "statute_activity"),
  ];

  return {
    labels: yearMonths.map(el => DateTime.fromISO(el).toFormat('MMMM yyyy', {locale: 'en'})),
    datasets: purposesList.map((purposeItem) => ({
      label: capitalizeFirstLetter(purposeItem.replace(/_/g, " ")),
      data: yearMonths.map((yearMonth) => {
        const current = rows.find((row) => {
          return (
            row.create_date_formatted === yearMonth &&
            row.purpose === purposeItem
          );
        });
        return current ? parseInt(current.amount_total) : 0;
      }),
    })),
  };
}

function summaryTableSegmentedByRecurrentAndRegularDonations(
  rows: DonationWithUserDataRow[]
) {
  let purposesList = [...new Set(rows.map((el) => el.purpose))];
  purposesList = [
    ...purposesList.filter((el) => el === "statute_activity"),
    ...purposesList.filter((el) => el !== "statute_activity"),
  ];

  const sumAmountOneTime = rows
    .filter((el) => el.is_automatic === 0)
    .reduce((acc, current) => acc + parseInt(current.amount), 0);
  const sumAmountRecurrent = rows
    .filter((el) => el.is_automatic === 1)
    .reduce((acc, current) => acc + parseInt(current.amount), 0);
  const sumAmountTotal = rows.reduce(
    (acc, current) => acc + parseInt(current.amount),
    0
  );

  const totalTdsByMonthStr = `
    <td style="text-align: right; padding: 8px; "><b>${moneyValue(sumAmountOneTime)}</b></td>
    <td style="text-align: right; padding: 8px; "><b>${moneyValue(sumAmountRecurrent)}</b></td>
    <td style="text-align: right; padding: 8px 0 8px 8px;"><b>${moneyValue(sumAmountTotal)}</b></td>
    `;

  return `<br /><table>
  <tbody><tr>
    <th style="vertical-align: bottom">Purpose</th>
    <th style="vertical-align: bottom; text-align: right; padding: 8px;">One-Time Donations</th>
    <th style="vertical-align: bottom; text-align: right; padding: 8px;">Recurrent Donations</th>
    <th style="vertical-align: bottom; text-align: right; padding: 8px 0 8px 8px;">Total</th>

    ${purposesList
      .map((purposeItem) => {
        const sumAmountOneTime = rows
          .filter((el) => el.purpose === purposeItem && el.is_automatic === 0)
          .reduce((acc, current) => acc + parseInt(current.amount), 0);
        const sumAmountRecurrent = rows
          .filter((el) => el.purpose === purposeItem && el.is_automatic === 1)
          .reduce((acc, current) => acc + parseInt(current.amount), 0);
        const sumAmountTotal = rows
          .filter((el) => el.purpose === purposeItem)
          .reduce((acc, current) => acc + parseInt(current.amount), 0);

        const tdsStr = `<td style="text-align: right; padding: 8px;">${moneyValue(sumAmountOneTime)}</td>
                <td style="text-align: right; padding: 8px;">${moneyValue(sumAmountRecurrent)}</td>
                <td style="text-align: right; padding: 8px 0 8px 8px;">${moneyValue(sumAmountTotal)}</td>
        `;

        return `<tr><td>${capitalizeFirstLetter(
          purposeItem.replace(/_/g, "&nbsp;")
        )}</td>${tdsStr}</tr>`;
      })
      .join("")}
    <tr style="border-top: 2px solid black; border-bottom: none;"><td><b>Total</b></td>${totalTdsByMonthStr}  </tr></tbody>
  </table>
  `;
}

// This summary table is companion for the chart showing donations by purpose by month. A good idea may be to use it
// in year report.
//
// function summaryTable(rows: DonationByPurposeByMonthRow[]) {
//   const yearMonths = [...new Set(rows.map((el) => el.create_date_formatted))];

//   let purposesList = [...new Set(rows.map((el) => el.purpose))];
//   purposesList = [
//     ...purposesList.filter((el) => el === "statute_activity"),
//     ...purposesList.filter((el) => el !== "statute_activity"),
//   ];

//   const totalAmountsByMonth = yearMonths.map((yearMonth) =>
//     rows
//       .filter((row) => row.create_date_formatted === yearMonth)
//       .reduce((acc, current) => acc + parseInt(current.amount_total), 0)
//   );

//   const totalTdsByMonthStr = totalAmountsByMonth
//     .map((el) => `<td style="text-align: right"><b>${moneyValue(el)}</b></td>`)
//     .join("");

//   return `<br /><table>
//   <tbody><tr>
//     <th>Purpose</th>
//     ${yearMonths.map((yearMonth) => `<th>${friendlyYearMonth(yearMonth)}</th>`).join("")}

//     ${purposesList
//       .map((purposeItem) => {
//         const amountByMonth = yearMonths.map((yearMonth) => {
//           const current = rows.find((row) => {
//             return (
//               row.create_date_formatted === yearMonth &&
//               row.purpose === purposeItem
//             );
//           });
//           return current
//             ? moneyValue(current.amount_total)
//             : "0";
//         });

//         const tdsStr = amountByMonth
//           .map((el) => `<td style="text-align: right">${el}&nbsp;₽</td>`)
//           .join("");

//         return `<tr><td>${capitalizeFirstLetter(purposeItem.replace(/_/g, " "))}</td>${tdsStr}</tr>`;
//       })
//       .join("")}
//     <tr style="border-top: 2px solid black; border-bottom: none;"><td><b>Total:</b></td>${totalTdsByMonthStr}  </tr></tbody>
//   </table>
//   `;
// }

function shortenEmail(email: string) {
  const arr = email.split("@");

  let username = arr[0] as string;
  const domain = arr[1] as string;

  if (username.length > 3) {
    username = username[0] + "***" + username[username.length - 1];
  }

  return username + "@" + domain;
}
