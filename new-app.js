require('dotenv').config(); // تحميل المتغيرات من ملف .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer'); // مكتبة إرسال البريد

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const usersFile = path.join(__dirname, 'users.json');

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

// ✅ إعداد خدمة البريد الإلكتروني
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // بريد المرسل
        pass: process.env.EMAIL_PASS   // كلمة مرور البريد
    }
});

// ✅ مسار تسجيل المستخدمين
app.post('/api/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صحيح.' });
    }

    fs.readFile(usersFile, (err, data) => {
        if (err) {
            console.error('❌ خطأ في قراءة ملف المستخدمين:', err.message);
            return res.status(500).json({ message: '❌ خطأ في الخادم.' });
        }

        let users = JSON.parse(data);
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: '❌ خطأ أثناء تشفير كلمة المرور.' });
            }

            const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
            users.push(newUser);

            fs.writeFile(usersFile, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error('❌ خطأ أثناء حفظ المستخدم:', err.message);
                    return res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
                }

                // ✅ إرسال بريد تأكيد التسجيل
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'تم التسجيل بنجاح',
                    text: `مرحبًا ${name}،\n\nلقد تم تسجيلك بنجاح في النظام. شكرًا لاستخدامك خدمتنا!`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('❌ خطأ في إرسال البريد:', error);
                    } else {
                        console.log('✅ تم إرسال البريد:', info.response);
                    }
                });

                res.status(201).json({ message: '✅ تم التسجيل بنجاح وتم إرسال بريد التأكيد!' });
            });
        });
    });
});

// ✅ تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
