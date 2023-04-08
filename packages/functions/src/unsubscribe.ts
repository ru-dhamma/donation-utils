import { ApiHandler } from "sst/node/api";
import { Time } from "@urd/core/time";
import { connection } from "@urd/core/db";

type RecurrentDonationWithUserDataRow = {
  id: number;
  user_id: number;
  donation_id: unknown;
  amount: string;
  invoice_id: number;
  nearest_donation_date: Date;
  user_notified: "0" | "1";
  cdd_pan_mask: string;
  recheck_at: unknown;
  recheck_period: unknown;
  created_at: Date;
  hash: string;
  email: string;
};

type DonationRow = {
  id: number;
  status: "new" | "paid";
  created_at: Date;
  amount: string;
};

const MAX_UNPAID = 3;

export const handler = ApiHandler(async (_evt) => {
  const recDonQuery = `SELECT recurrent_donations.id, user.email,
    recurrent_donations.id,
    recurrent_donations.hash,
    recurrent_donations.user_id,
    recurrent_donations.hash, recurrent_donations.amount from recurrent_donations
    LEFT JOIN user on user.id = recurrent_donations.user_id`;
  let [rows] = await connection().query(recDonQuery);

  console.log('MAX_UNPAID', MAX_UNPAID);

  let count = 0;
  const recDonRows = rows as unknown as RecurrentDonationWithUserDataRow[];

  for (const recDonationRow of recDonRows) {
    const query = `SELECT status, created_at, amount FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    const [rows] = await connection().query(query, [recDonationRow.user_id, MAX_UNPAID]);

    const donationRows = rows as unknown as DonationRow[];

    if (unsubscribeIsRequired(donationRows)) {
      count++;
      console.log(
        `https://preshetin.budibase.app/app/dullabha-dashboard#/users/${recDonationRow.user_id}/donations`
      );

      // I want to test it so that unsubscribes are done in multiple lambda runs.
      if (count > 10) {
        break;
      }

      // trigger budibase webhook that will run Unsubscribe budibase automation
    }
  }

  console.log("total unsubscribes:", count);

  return {
    body: `Unsubscribe. The time is ${Time.now()}`,
  };
});

function unsubscribeIsRequired(donations: any[]) {
  if (donations.length < MAX_UNPAID) return false;
  if (donations.filter((d) => d.status === "paid").length) return false;
  return true;
}
