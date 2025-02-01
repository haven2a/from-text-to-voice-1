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

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        
EMAIL_USER=hacenatek9@gmail.com
EMAIL_PASS=hmhi fvrk nghr gdxd
    }
});

app.post('/api/subscribe', async (req, res) => {
    console.log('بيانات التسجيل:', req.body);
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

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'تم التسجيل بنجاح',
            html: `
            <div style="font-family: 'Cairo', sans-serif; text-align: center; border: 2px solid #4CAF50; padding: 20px; max-width: 600px; margin: auto;">
                <img src="cid:logo" alt="Logo" style="width: 100px; display: block; margin: auto;">
                <h2 style="color: #4CAF50;">مرحبًا ${name}،</h2>
                <p style="font-size: 18px;">لقد تم تسجيلك بنجاح في النظام. شكرًا لاستخدامك خدمتنا!</p>
                <p style="font-size: 18px;">يمكنك تسجيل الدخول عبر الرابط التالي:</p>
                <a href="https://from-text-to-voice-6nye.vercel.app/login.html" style="font-size: 18px; color: #FFFFFF; background-color: #4CAF50; padding: 10px 20px; text-decoration: none; border-radius: 5px;">تسجيل الدخول</a>
                <p style="font-size: 18px; margin-top: 20px;">للدعم، يمكنك زيارة:</p>
                <a href="https://from-text-to-voice-6nye.vercel.app/suport.html" style="font-size: 18px; color: #FFFFFF; background-color: #FF9800; padding: 10px 20px; text-decoration: none; border-radius: 5px;">الدعم الفني</a>
            </div>`,
            attachments: [{
                filename: 'logo.png',
                path: path.join(__dirname, 'logo.png'),
                cid: 'logo'
            }]
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

app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
