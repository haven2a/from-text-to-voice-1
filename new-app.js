require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const usersFile = path.join(__dirname, 'users.json');

// التأكد من أن ملف المستخدمين موجود
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

// إعداد خدمة البريد الإلكتروني
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // تأكد من إضافة البريد الإلكتروني في .env
        pass: process.env.EMAIL_PASS  // تأكد من إضافة كلمة المرور في .env
    }
});

// مسار تسجيل المستخدمين
app.post('/api/subscribe', async (req, res) => {
    console.log('بيانات التسجيل:', req.body); // تسجيل البيانات المستلمة من العميل
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صحيح.' });
    }

    try {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // إرسال البريد الإلكتروني
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'تم التسجيل بنجاح في النظام',
            html: `
            <div style="font-family: 'Cairo', sans-serif; background-color: #f7f7f7; padding: 20px; border-radius: 10px; border: 2px solid #dedede;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="cid:logo" alt="Logo" style="width: 150px; height: auto;" />
                </div>
                <h2 style="color: #333; text-align: center; font-size: 28px;">مرحبًا ${name}!</h2>
                <p style="font-size: 18px; color: #555; text-align: center;">
                    تم تسجيلك بنجاح في النظام. <br>
                    شكرًا لاستخدامك خدمتنا.
                </p>
                <p style="font-size: 16px; color: #555; text-align: center;">
                    يمكنك الآن تسجيل الدخول إلى حسابك من خلال الرابط التالي:
                </p>
                <p style="text-align: center;">
                    <a href="http://localhost:3000/login.html" style="font-size: 18px; color: #007bff; text-decoration: none;">رابط تسجيل الدخول</a>
                </p>
                <p style="font-size: 16px; color: #555; text-align: center;">
                    إذا كنت بحاجة إلى دعم، يمكنك التواصل معنا من خلال الرابط التالي:
                </p>
                <p style="text-align: center;">
                    <a href="http://localhost:3000/support.html" style="font-size: 18px; color: #007bff; text-decoration: none;">رابط الدعم</a>
                </p>
            </div>
            `,
            attachments: [
                {
                    filename: 'logo.png', // تأكد من أن الصورة موجودة في المجلد
                    path: path.join(__dirname, 'logo.png'), // تأكد من مسار الصورة
                    cid: 'logo' // هذا المرجع لاستخدامه في HTML
                }
            ]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ خطأ في إرسال البريد:', error);
            } else {
                console.log('✅ تم إرسال البريد:', info.response);
            }
        });

        res.status(201).json({ message: '✅ تم التسجيل بنجاح وتم إرسال بريد التأكيد!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل المستخدم:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
