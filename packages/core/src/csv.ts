import { parse } from "csv-parse/sync";
export * as Csv from "./csv";

export function csvParse(csvString: string) {
  return parse(csvString, {
    delimiter: ";",
    columns: true,
  });
}
