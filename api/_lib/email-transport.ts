import nodemailer from 'nodemailer';

// Configuration Nodemailer - TOUJOURS no-reply@fornap.fr
export function createEmailTransporter() {
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.fornap.fr',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // TLS sur port 587
    auth: {
      user: process.env.SMTP_USER || 'no-reply@fornap.fr',
      pass: process.env.SMTP_PASSWORD || 'rU6*suHY_b-ce1Z',
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransport(smtpConfig);
}
