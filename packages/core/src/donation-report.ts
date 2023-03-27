export * as DonationReport from './donation-report'
import { connection } from "./db";
import { Pdf } from './pdf';

export type DonationWithUserDataRow = {
  id: number;
  user_id: number;
  status: "paid" | "new";
  amount: string;
  created_at: Date;
  is_automatic: number;
  is_rebilling: number;
  purpose: string;
  email: string;
};

type DonationByPurposeByMonthRow = {
  create_date_formatted: string;
  amount_total: string;
  purpose: string;
  month: number;
  year: number;
};

export async function buildPdfLink(from: Date, to: Date) {

  const html = await buildHtml(from, to);

  const pdf = (await Pdf.create(html)).data;

  return  pdf.data.url
}


export async function buildHtml(from: Date, to: Date) {
  const donationsQuery = `select * from donations left join user on user.id = donations.user_id 
    WHERE status = 'paid'
    AND
    created_at >= '${from.toISOString().substring(0, 10)} 00:00:00'
    and
    created_at < '${addDays(to, 1).toISOString().substring(0, 10)} 00:00:00'`;

  const [rows] = await connection().query(donationsQuery);

  const donRows = rows as unknown as DonationWithUserDataRow[];

// This SQL query is used for building a chart by purpose by month. A good idea to use this chart in yearly report.
//
//   const donationsByPurposeQuery = `
// 	 SELECT DATE_FORMAT(created_at, '%Y-%m') as create_date_formatted,
// 	 sum(amount) as amount_total, 
// 	 purpose, 
// 	 month(created_at) as 'month',
// 	year(created_at) as 'year'
// FROM donations
// WHERE status = 'paid'
// and
//   created_at >= '${from.toISOString().substring(0, 10)} 00:00:00'
//   and
//   created_at < '${addDays(to, 1).toISOString().substring(0, 10)} 00:00:00'
// 	group by year, month, purpose;
//   `;
//   const donationsByPurposeRes = await connection().query(
//     donationsByPurposeQuery
//   );
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
  <img src="https://ru.dhamma.org/fileadmin/sys/img/dhammawheel.png" width="53" height="75">
    <span style=" font-size: 1.7em; color: gray; ">Dullabha</span>
    </div>
  </div>

 

  <h1 style="font-size: 2.4em;">Online Donations during ${from.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &mdash; ${to.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h1>
  <p>This report is created at ${(new Date()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
  <p>This is an overview of donations for Dhamma Dullabha collected via <a href="https://donation.dhamma-dullabha.org">online form</a>. It also has the list of all people emails that made a donation in the reported period.</p>
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
  <hr />
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
};

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
    <th>Amount</th>
  </tr>
    ${donations
      .map(
        (don) =>
          `<tr> <td>${don.created_at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>  <td> ${
            shortenEmail(don.email) 
          }</td>  <td style="text-align: right">${numberWithCommas(
            parseInt(don.amount)
          )}&nbsp;&#8381</td> </tr>`
      )
      .join("")}
  </table>
  `;
  return result;
}

function wrapHtml(html: string, chartData: any) {
  return `
  <!DOCTYPE html>
<html>
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
  padding: 8px;
}

tr {
  border-bottom: 1px solid #ddd;
}

.row {
  display: flex;
  gap: 4%;
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

  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
  }

  return arr.join(" ");
}

function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildChartData(rows: DonationByPurposeByMonthRow[]) {
  const yearMonths = [...new Set(rows.map((el) => el.create_date_formatted))];

  let purposesList = [...new Set(rows.map((el) => el.purpose))];
  purposesList = [
    ...purposesList.filter((el) => el === "statute_activity"),
    ...purposesList.filter((el) => el !== "statute_activity"),
  ];

  return {
    labels: yearMonths.map(el => friendlyYearMonth(el)),
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

function summaryTableSegmentedByRecurrentAndRegularDonations(rows: DonationWithUserDataRow[]) {
  let purposesList = [...new Set(rows.map((el) => el.purpose))];
  purposesList = [
    ...purposesList.filter((el) => el === "statute_activity"),
    ...purposesList.filter((el) => el !== "statute_activity"),
  ];

  const sumAmountOneTime = rows.filter(el => el.is_automatic === 0).reduce((acc, current) => acc + parseInt(current.amount), 0);
  const sumAmountRecurrent = rows.filter(el => el.is_automatic === 1).reduce((acc, current) => acc + parseInt(current.amount), 0);
  const sumAmountTotal = rows.reduce((acc, current) => acc + parseInt(current.amount), 0);

  const totalTdsByMonthStr = `
    <td style="text-align: right"><b>${numberWithCommas(sumAmountOneTime)}&nbsp;₽</b></td>
    <td style="text-align: right"><b>${numberWithCommas(sumAmountRecurrent)}&nbsp;₽</b></td>
    <td style="text-align: right"><b>${numberWithCommas(sumAmountTotal)}&nbsp;₽</b></td>
    `;

  return `<br /><table>
  <tbody><tr>
    <th>Purpose</th>
    <th>One-Time Donations</th>
    <th>Recurrent Donations</th>
    <th>Total</th>

    ${purposesList
      .map((purposeItem) => {
        const sumAmountOneTime = rows.filter(el => el.purpose === purposeItem && el.is_automatic === 0).reduce((acc, current) => acc + parseInt(current.amount), 0);
        const sumAmountRecurrent = rows.filter(el => el.purpose === purposeItem && el.is_automatic === 1).reduce((acc, current) => acc + parseInt(current.amount), 0);
        const sumAmountTotal = rows.filter(el => el.purpose === purposeItem).reduce((acc, current) => acc + parseInt(current.amount), 0);

        const tdsStr = `<td style="text-align: right">${numberWithCommas(sumAmountOneTime)}&nbsp;₽</td>
                <td style="text-align: right">${numberWithCommas(sumAmountRecurrent)}&nbsp;₽</td>
                <td style="text-align: right">${numberWithCommas(sumAmountTotal)}&nbsp;₽</td>
        `;

        return `<tr><td>${capitalizeFirstLetter(purposeItem.replace(/_/g, " "))}</td>${tdsStr}</tr>`;
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
//     .map((el) => `<td style="text-align: right"><b>${numberWithCommas(el)}&nbsp;₽</b></td>`)
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
//             ? numberWithCommas(parseInt(current.amount_total))
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

function friendlyYearMonth(str: string) {
  const arr = str.split('-')
  return getMonthName(parseInt(arr[1])) + ' ' + arr[0]
}

function getMonthName(monthNumber: number) {
  const date = new Date();
  date.setMonth(monthNumber - 1);

  return date.toLocaleString('en-US', { month: 'long' });
}

function addDays(date: Date, days: number) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


function shortenEmail(email: string) {
  const arr = email.split('@');

  let username = arr[0] as string;
  const domain = arr[1] as string;

  if (username.length > 3 ) {
    username = username[0] + '***' + username[username.length - 1]
  }

  return username + "@" + domain;
}

