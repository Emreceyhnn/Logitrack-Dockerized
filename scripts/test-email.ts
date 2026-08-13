import { sendEmail } from "../app/lib/services/email";

async function run() {
  console.log("Testing email service...");
  try {
    await sendEmail({
      to: "emreceyhnn@gmail.com",
      subject: "Test Email from LogiTrack",
      html: "<p>This is a test email sent from the LogiTrack application.</p>",
    });
    console.log("Test email sent successfully!");
  } catch (error) {
    console.error("Error sending test email:", error);
    process.exit(1);
  }
}

run();
