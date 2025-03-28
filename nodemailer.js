const nodemailer = require('nodemailer');

// إعدادات النقل باستخدام SMTP من Gmail
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // عنوان خادم البريد (SMTP)
    port: 587, // المنفذ المستخدم (587 للاتصال غير المشفر)
    secure: false, // false للمنفذ 587 (لاستخدام TLS)
    auth: {
        user: process.env.EMAIL, // البريد الإلكتروني (يتم تخزينه في متغير البيئة)
        pass: process.env.EMAIL_PASSWORD, // كلمة المرور (يتم تخزينها في متغير البيئة)
    },
});

// التحقق من إعدادات الاتصال بالخادم
transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to mail server:', error);
    } else {
        console.log('Mail server is ready to take messages:', success);
    }
});
