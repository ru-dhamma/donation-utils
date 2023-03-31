export * as Pdf from "./pdf";
import axios from "axios";
import { Config } from "sst/node/config";

// export const create = (html: string) => {
//   return new Promise(async (resolve, reject) => {
//     let browser = await chromium.puppeteer.launch({
//         args: chromium.args,
//         defaultViewport: chromium.defaultViewport,
//         executablePath: await chromium.executablePath,
//         headless: chromium.headless,
//         ignoreHTTPSErrors: true,
//     });

//     const page = await browser.newPage();
//     await page.setContent(html);

//     const buffer = await page.pdf({
//         format: "letter",
//         printBackground: true,
//         // margin: "0.5cm",
//     });
//     if (!buffer) {
//         reject('A failure occurred and the pdf could not be generated.');
//     }

//     resolve(buffer);
// });
// }

export async function create(html: string) {
  const header_html = `
<div style="
    display: flex;
">
    <div style="
    margin: auto;
    display: flex;
    align-items: center;
    gap: 11px;
">
    <span style=" font-size: 1.5em; color: gray; ">Dhamma</span>
  <img src="https://ru.dhamma.org/fileadmin/sys/img/dhammawheel.png" width="40" height="56">
    <span style=" font-size: 1.5em; color: gray; ">Dullabha</span>
    </div>
  </div>
  `;

  const options = {
    method: "POST",
    url: "https://api.pdfendpoint.com/v1/convert",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Config.PDF_ENDPOINT_API_KEY}`,
    },
    data: {
      orientation: "vertical",
      page_size: "A4",
      margin_top: "2cm",
      margin_bottom: "2cm",
      margin_left: "2cm",
      margin_right: "2cm",
      html,
      //    header_html,
      sandbox: !!process.env.IS_LOCAL,
      // "wait_for_timeout": "3000",
      // "wait_for_selector": "#myChart4",

      // Viewport may be used when Javascript is executed for things
      // like charts.
      // "viewport ": "900x500",

      filename: "online-donations.pdf",
    },
  };

  return await axios.request(options);
}
