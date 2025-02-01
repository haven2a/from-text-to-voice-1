transporter.verify((error, success) => {
    if (error) {
        console.log('❌ خطأ في الاتصال بـ SMTP:', error);
    } else {
        console.log('✅ الاتصال بـ SMTP ناجح، جاهز للإرسال!');
    }
});
