import { DateTime } from "luxon";
import { ApiHandler } from "sst/node/api";
import { buildHtml } from "@urd/core/donation-report";

type QueryParams = {
  from: "string";
  to: "string";
};

export const handler = ApiHandler(async (_evt) => {
  const queryParams = _evt.queryStringParameters as QueryParams | undefined;

  // console.log('queryParams', queryParams)

  let from = DateTime.now().startOf('month').startOf('day');
  let to = DateTime.now();

  // Example:  /donor-report?from=2023-01-01&to=2023-01-31
  if (queryParams) {
    from = DateTime.fromISO(queryParams.from);
    to = DateTime.fromISO(queryParams.to);
  }
  from = from.startOf('month').startOf('day');
  to = to.endOf('day');

  const html = await buildHtml(from, to);

  return {
    statusCode: 200,
    headers: { "content-type": "text/html" },
    body: html,
  };
});
