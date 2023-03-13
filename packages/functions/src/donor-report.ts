import { ApiHandler } from "sst/node/api";
import { Time } from "@urd/core/time";
import { connection } from "@urd/core/db";

type DonationWithUserDataRow = {
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

export const handler = ApiHandler(async (_evt) => {
  // query list of donations
  // build html
  // (optionally) build pdf from html

//  const donationsQuery = `select * from donations left join user on user.id = donations.user_id where created_at BETWEEN (CURDATE() - INTERVAL 30 DAY) AND CURDATE();`


  // Stolen from https://stackoverflow.com/a/2090235/4990125
  const donationsQuery = `select * from donations left join user on user.id = donations.user_id 
    WHERE status = 'paid'
    AND
    YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 2 MONTH)
    AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 2 MONTH)`

  const [rows] = await connection().query(donationsQuery);

  const donRows = rows as unknown as DonationWithUserDataRow[];

  //  const rows = [
  //  { id: 2000, payment_instruction_id: 2000, recurrent_donation_id: null, user_id: 2000, status: 'paid', amount: '1.00000', is_rebilling: 0, is_automatic: 0, purpose: 'statute_activity',
  //    created_at: "2018-03-10T13:46:39.000Z", email: 'preshetin@gmail.com', platform: 'dhamma-dullabha.org' },
  //  { id: 2001, payment_instruction_id: 2001, recurrent_donation_id: null, user_id: 2001, status: 'paid', amount: '1.00000', is_rebilling: 1, is_automatic: 0,
  //    purpose: 'statute_activity', created_at: "2018-03-10T13:53:28.000Z", email: 'preshetin+prodMonthly@gmail.com', platform: 'dhamma-dullabha.org' },
  //  ];
 
  
//  console.log('row', rows)


  const purposesList = [...new Set(donRows.map((el) => el.purpose))];

  console.log("purposesList", purposesList);

  let html = "";
  for (const purpose of purposesList) {
    const oneTimeDonations = donRows.filter((don) => don.purpose === purpose && don.is_automatic === 0);
    const recurrentDonations = donRows.filter((don) => don.purpose === purpose && don.is_automatic === 1);

    console.log('recurrentDonations', recurrentDonations.length)

    html += `
  <h1>${purpose}</h1>
<div class="row">
  <div class="column">

  
  <h2>One-time donations</h2>
  ${buildDonorsHtmlForPurpose(purpose, oneTimeDonations)}

  </div>
  <div class="column">
  
  <h2>Recurrent donations</h2>
  ${buildDonorsHtmlForPurpose(purpose, recurrentDonations)}
  
  </div>
</div>
    `
  }

  return {
    statusCode: 200,
    headers: { "content-type": "text/html" },
    body: wrapHtml(html),
  };
});

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
      .map((don) => `<tr> <td>${don.created_at.toLocaleDateString()}</td>  <td> ${don.email}</td>  <td>${parseInt(don.amount)}₽</td> </tr>`).join('')}
  </table>
  `;
  return result;
}

function wrapHtml(html: string) {
  return `
  <!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>

body {
  font-family: arial, sans-serif;
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
</style>
</head>
<body>
  ${html}
</body>
</html>
  `;
}
