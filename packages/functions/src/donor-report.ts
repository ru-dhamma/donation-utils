import { ApiHandler } from "sst/node/api";
import { buildHtml } from "@urd/core/donation-report";

type QueryParams = {
  from: "string";
  to: "string";
};

export const handler = ApiHandler(async (_evt) => {
  const queryParams = _evt.queryStringParameters as QueryParams | undefined;

  // console.log('queryParams', queryParams)

  let from = addDays(new Date(), -30);
  let to = new Date();

  // Example:  /donor-report?from=2023-01-01&to=2023-01-31
  if (queryParams) {
    from = new Date(queryParams.from);
    to = new Date(queryParams.to);
  }

  const html = await buildHtml(from, to);

  return {
    statusCode: 200,
    headers: { "content-type": "text/html" },
    body: html,
  };
});

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
