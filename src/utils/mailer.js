import { Resend } from "resend";

const getFromEmail = () => {
  const name = process.env.EMAIL_FROM_NAME || "HyperIndoStore";
  const address = process.env.EMAIL_FROM_ADDRESS || "noreply@hypeid.store";

  return `${name} <${address}>`;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY belum diatur");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return data;
};