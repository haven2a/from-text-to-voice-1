require('dotenv').config();
const express = require('express');
const fs = require('fs').promises; // استخدام fs.promises للتعامل غير المتزامن مع الملفات
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

// التأكد من أن ملف المستخدمين موجود؛ وإذا لم يكن موجودًا، يتم إنشاؤه
async function ensureUsersFileExists() {
    try {
        await fs.access(usersFile);
    } catch (error) {
        await fs.writeFile(usersFile, JSON.stringify([], null, 2));
    }
}
ensureUsersFileExists();

// إعداد خدمة البريد الإلكتروني باستخدام nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // البريد الإلكتروني من ملف البيئة
        pass: process.env.EMAIL_PASS   // كلمة المرور من ملف البيئة
    }
});

// ✅ **مسار تسجيل المستخدمين**
app.post('/api/subscribe', async (req, res) => {
    console.log('📩 بيانات التسجيل:', req.body); // تسجيل البيانات المستلمة من العميل
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صحيح.' });
    }

    try {
        // قراءة ملف المستخدمين
        let users = JSON.parse(await fs.readFile(usersFile, 'utf8'));

        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // إنشاء بيانات المستخدم الجديد
        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        // كتابة البيانات إلى ملف المستخدمين
        await fs.writeFile(usersFile, JSON.stringify(users, null, 2));

        // إعداد البريد الإلكتروني
        const mailOptions = {
            from: process.env.EMAIL_USER,  // البريد الإلكتروني من ملف البيئة
            to: email,
            subject: 'تم التسجيل بنجاح',
            text: `مرحبًا ${name}،\n\nلقد تم تسجيلك بنجاح في النظام. شكرًا لاستخدامك خدمتنا!`
        };

        // إرسال البريد الإلكتروني
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

// ✅ **مسار تسجيل الدخول**
app.post('/api/login', async (req, res) => {
    console.log('🔐 بيانات تسجيل الدخول:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ يجب إدخال البريد الإلكتروني وكلمة المرور.' });
    }

    try {
        let users = JSON.parse(await fs.readFile(usersFile, 'utf8'));

        // البحث عن المستخدم
        const user = users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ message: '⚠️ المستخدم غير موجود.' });
        }

        // مقارنة كلمة المرور المدخلة مع المشفرة في الملف
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

// ✅ **تشغيل السيرفر**
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
