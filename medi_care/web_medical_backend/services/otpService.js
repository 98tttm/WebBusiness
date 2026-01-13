import http from "http";
import https from "https";
import { URL } from "url";

function postJson(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(webhookUrl);
    const data = JSON.stringify(payload);
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const transport = target.protocol === "https:" ? https : http;
    const req = transport.request(target, options, (res) => {
      res.on("data", () => {});
      res.on("end", () => {
        resolve(res.statusCode);
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function dispatchOtp(phone, code) {
  const webhookUrl = process.env.OTP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.info(`[OTP] Dispatch skipped (no webhook). phone=${phone} code=${code}`);
    return { delivered: false, reason: "webhook_not_configured" };
  }
  try {
    const status = await postJson(webhookUrl, { phone, code });
    if (status && status >= 200 && status < 300) {
      return { delivered: true };
    }
    const message = `OTP webhook responded with status ${status}`;
    console.error(message);
    return { delivered: false, reason: "webhook_error", detail: message };
  } catch (error) {
    console.error("Failed to deliver OTP via webhook:", error);
    return { delivered: false, reason: "webhook_exception", detail: error.message };
  }
}
