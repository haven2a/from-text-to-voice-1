require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs'); // استخدام bcryptjs بدلاً من bcrypt لتجنب المشاكل في Vercel
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
        user: process.env.EMAIL_USER,  // استخدام المتغير من البيئة
        pass: process.env.EMAIL_PASS   // استخدام المتغير من البيئة
    }
});

// 📌 تسجيل المستخدمين
app.post('/api/subscribe', async (req, res) => {
    console.log('📥 بيانات التسجيل:', req.body);
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

        // التحقق من وجود البريد الإلكتروني مسبقًا
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // إضافة المستخدم الجديد
        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        // تحديث ملف المستخدمين
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // ✉️ إرسال البريد الإلكتروني
        const mailOptions = {
            from: '"منصة الصوت إلى نص" <hacenatek9@gmail.com>',
            to: email,
            subject: '🎉 تم التسجيل بنجاح - منصة تحويل النص إلى صوت',
            html: `
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; font-family: 'Cairo', sans-serif; text-align: center;">
                    <img src="https://from-text-to-voice-6nye.vercel.app/logo.png" alt="شعار الموقع" style="width: 100px; margin-bottom: 20px;">
                    <h2 style="color: #007bff;">🎉 مرحبًا ${name}، تم تسجيلك بنجاح!</h2>
                    <p style="font-size: 18px; color: #333;">يمكنك الآن تسجيل الدخول إلى حسابك من خلال الرابط أدناه:</p>
                    <a href="https://from-text-to-voice-6nye.vercel.app/login.html" style="display: inline-block; padding: 10px 20px; margin-top: 10px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px;">🔑 تسجيل الدخول</a>
                    <p style="margin-top: 20px; font-size: 16px;">إذا واجهت أي مشكلة، يمكنك زيارة صفحة الدعم:</p>
                    <a href="https://from-text-to-voice-6nye.vercel.app/suport.html" style="display: inline-block; padding: 10px 20px; margin-top: 10px; background-color: #ff9800; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px;">🔧 صفحة الدعم</a>
                    <p style="margin-top: 20px; font-size: 14px; color: #888;">شكرًا لاستخدام منصتنا! 🎶</p>
                </div>
            `
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

// 🔑 **تسجيل الدخول**
app.post('/api/login', async (req, res) => {
    console.log('🔐 محاولة تسجيل الدخول:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ البريد وكلمة المرور مطلوبان!' });
    }

    try {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(user => user.email === email);

        if (!user) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير مسجل.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '⚠️ كلمة المرور غير صحيحة.' });
        }

        res.status(200).json({ message: '✅ تسجيل الدخول ناجح!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء تسجيل الدخول.' });
    }
});

// 🚀 تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
