import { ApiHandler } from "sst/node/api";
import { Time } from "@urd/core/time";
import { Pdf } from "@urd/core/pdf";
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

type DonationByPurposeByMonthRow = {
  create_date_formatted: string;
  amount_total: string;
  purpose: string;
  month: number;
  year: number;
};

export const handler = ApiHandler(async (_evt) => {
  // Stolen from https://stackoverflow.com/a/2090235/4990125
  const donationsQuery = `select * from donations left join user on user.id = donations.user_id 
    WHERE status = 'paid'
    AND
    YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 2 MONTH)
    AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 2 MONTH)`;

  const [rows] = await connection().query(donationsQuery);

  const donRows = rows as unknown as DonationWithUserDataRow[];

  const donationsByPurposeQuery = `
	 SELECT DATE_FORMAT(created_at, '%Y-%m') as create_date_formatted,
	 sum(amount) as amount_total, 
	 purpose, 
	 month(created_at) as 'month',
	year(created_at) as 'year'
FROM donations
WHERE status = 'paid'
and
created_at >= '2022-11-01 00:00:00'
and
created_at <= '2023-02-28 23:59:59'
	group by year, month, purpose;
  `;

  const donationsByPurposeRes = await connection().query(
    donationsByPurposeQuery
  );


  const donationsByPurposeByMonthRows =
    donationsByPurposeRes[0] as unknown as DonationByPurposeByMonthRow[];

  console.log('11',donationsByPurposeByMonthRows[0])

  const purposesList = [...new Set(donRows.map((el) => el.purpose))];

  const chartData = buildChartData(donationsByPurposeByMonthRows);

  let html = `
  <h1>Online Donations at Dhamma Dullabha</h1>
  <p style=" text-align: center;">January 2023</p>
  <br />
  <div class="wrapper">
    <canvas id="myChart4"></canvas>
  </div>

  <div>

  <table>
  <tbody><tr>
    
    <th>Purpose</th>
    <th>Jan 2023</th>
  <th>Dec 2022</th></tr>
    <tr> 
      <td>Statute Activity</td>  <td style="text-align: right">15,000&nbsp;₽</td> <td style="text-align: right">15,000&nbsp;₽</td></tr>
    
    <tr>   <td>New Meditation Center</td>  <td style="text-align: right">30,000&nbsp;₽</td> <td style="text-align: right">30,000&nbsp;₽</td></tr>
    <tr>   <td>New Female Residential Building</td>  <td style="text-align: right">500&nbsp;₽</td> <td style="text-align: right">500&nbsp;₽</td></tr>
    <tr>   <td>Moscow Region Noncenter</td>  <td style="text-align: right">2,000&nbsp;₽</td> <td style="text-align: right">2,000&nbsp;₽</td></tr>
    <tr>   <td>Teacher Expenses</td>  <td style="text-align: right">4,000&nbsp;₽</td> <td style="text-align: right">4,000&nbsp;₽</td></tr>
    <tr>   <td>Children Courses</td>  <td style="text-align: right">1,000&nbsp;₽</td> <td style="text-align: right">1,000&nbsp;₽</td></tr>
    
    <tr>   <td>Total:</td>  <td style="text-align: right">1,000&nbsp;₽</td> <td style="text-align: right">1,000&nbsp;₽</td></tr></tbody></table>

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

    // console.log("recurrentDonations", recurrentDonations.length);

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

  html = wrapHtml(html, chartData);

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

  const pdf = (await Pdf.create(html)).data;

  console.log(pdf.data.url);

  return {
    statusCode: 200,

    headers: { "content-type": "text/html" },
    body: html,

    //  headers: {
    //     "Content-Type": "application/pdf", //you can change any content type
    //     "Content-Disposition": "inline; filename=report-Jan-2023.pdf", // key of success
    //   },

    //    headers: { "content-type": "application/json" },
    //     body: JSON.stringify(pdf.data)
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
      .map(
        (don) =>
          `<tr> <td>${don.created_at.toLocaleDateString()}</td>  <td> ${
            don.email
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
  margin-top:50px;
  font-weight:200;
  text-align: center;
  display: block;
  text-decoration: none;
}

</style>
</head>
<body>
  ${html}
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
  
  var ctx = document.getElementById("myChart4");
  new Chart(ctx, {
    type: 'bar',
    data: ${JSON.stringify(chartData)},
  options: {
      tooltips: {
        displayColors: true,
        callbacks:{
          mode: 'x',
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          ticks: {
            beginAtZero: true,
          },
          type: 'linear',
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      legend: { position: 'bottom' },
    }
  });


  </script>
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
  // console.log('111', rows)

  const yearMonths = [...new Set(rows.map((el) => el.create_date_formatted))];

  const purposesList = [...new Set(rows.map((el) => el.purpose))];

  return {
    labels: yearMonths,
    datasets: purposesList.map((purposeItem) => ({
      label: purposeItem,
      data: yearMonths.map((yearMonth) => {
        const current = rows.find((row) => {
          return (
            row.create_date_formatted === yearMonth &&
            row.purpose === purposeItem
          );
        });
        return current ?  parseInt(current.amount_total) : 0;
      }),
    })),
  };


  return {
    labels: ["Oct 2022", "Nov 2022", "Dec 2022", "Jan 2023"],
    datasets: [
      {
        label: "Statute Activity",
        backgroundColor: "#caf270",
        data: [512, 59, 22, 55],
      },
      {
        label: "New Meditation Center",
        backgroundColor: "#45c490",
        data: [132, 59, 12, 77],
      },
      {
        label: "New Female Residential Building",
        backgroundColor: "#008d93",
        data: [12, 59, 33, 66],
      },
      {
        label: "Moscow Region Noncenter",
        backgroundColor: "#2e5468",
        data: [12, 59, 88, 44],
      },
      {
        label: "Teacher Expenses",
        backgroundColor: "#2e5468",
        data: [12, 59, 88, 44],
      },
      {
        label: "Children Courses",
        backgroundColor: "#2e5468",
        data: [12, 59, 88, 44],
      },
    ],
  };
}

