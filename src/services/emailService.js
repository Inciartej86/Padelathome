const nodemailer = require('nodemailer');

// 1. Creamos el "transportador" que usará los datos del .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// 2. Creamos una función reutilizable para enviar los correos
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);
    
    // Log para previsualizar con Ethereal
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('Error al intentar enviar el correo:', error);
  }
};

module.exports = sendEmail;