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

// التأكد من تحميل ملف المستخدمين بدون مشاكل
let users = [];
try {
    if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } else {
        fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
    }
} catch (error) {
    console.error('❌ خطأ في تحميل ملف المستخدمين:', error);
    users = [];
}

// إعداد البريد الإلكتروني
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 📌 تسجيل المستخدمين
app.post('/api/subscribe', async (req, res) => {
    console.log('📥 بيانات التسجيل:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    if (users.some(user => user.email === email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        const mailOptions = {
            from: '"منصة الصوت إلى نص" <hacenatek9@gmail.com>',
            to: email,
            subject: '🎉 تم التسجيل بنجاح',
            html: `<h2>مرحبًا ${name}، تم تسجيلك بنجاح!</h2>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('❌ خطأ في إرسال البريد:', error);
            else console.log('✅ تم إرسال البريد:', info.response);
        });

        res.status(201).json({ message: '✅ تم التسجيل بنجاح وتم إرسال بريد التأكيد!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل المستخدم:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
    }
});

// 🔑 تسجيل الدخول
app.post('/api/login', async (req, res) => {
    console.log('🔐 محاولة تسجيل الدخول:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ البريد وكلمة المرور مطلوبان!' });
    }

    const user = users.find(user => user.email === email);
    if (!user) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير مسجل.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: '⚠️ كلمة المرور غير صحيحة.' });
    }

    res.status(200).json({ message: '✅ تسجيل الدخول ناجح!', user: { name: user.name, email: user.email } });
});

// 🚀 تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
