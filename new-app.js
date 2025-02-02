require('dotenv').config();
const express = require('express');
const fs = require('fs').promises; // استخدام fs.promises للقراءة والكتابة بشكل آمن
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const usersFile = path.join(__dirname, 'users.json');

// ✅ **التأكد من وجود ملف المستخدمين وإنشاؤه عند الضرورة**
async function ensureUsersFileExists() {
    try {
        await fs.access(usersFile);
    } catch (error) {
        await fs.writeFile(usersFile, JSON.stringify([]));
    }
}
ensureUsersFileExists();

// ✅ **إعداد البريد الإلكتروني**
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  
        pass: process.env.EMAIL_PASS  
    }
});

// ✅ **مسار تسجيل المستخدمين `/api/subscribe`**
app.post('/api/subscribe', async (req, res) => {
    console.log('📩 بيانات التسجيل المستلمة:', req.body);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    try {
        let users = [];
        try {
            const data = await fs.readFile(usersFile, 'utf8');
            users = JSON.parse(data);
        } catch (error) {
            console.warn('⚠️ ملف المستخدمين فارغ أو غير موجود، سيتم إنشاؤه.');
            users = [];
        }

        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            name,
            email,
            password: hashedPassword,
            registeredAt: new Date().toISOString()
        };

        users.push(newUser);
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'تم التسجيل بنجاح',
            text: `مرحبًا ${name}،\n\nلقد تم تسجيلك بنجاح. شكرًا لاستخدامك خدمتنا!`
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

// ✅ **مسار تسجيل الدخول `/api/login`**
app.post('/api/login', async (req, res) => {
    console.log('🔐 بيانات تسجيل الدخول:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ يجب إدخال البريد الإلكتروني وكلمة المرور.' });
    }

    try {
        let users = JSON.parse(await fs.readFile(usersFile, 'utf8'));

        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ message: '⚠️ المستخدم غير موجود.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '⚠️ كلمة المرور غير صحيحة.' });
        }

        res.status(200).json({ message: '✅ تم تسجيل الدخول بنجاح!' });
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء تسجيل الدخول.' });
    }
});

module.exports = app;
