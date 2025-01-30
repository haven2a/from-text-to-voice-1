const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// السماح بالطلبات من أي مكان (Vercel أو أي بيئة أخرى)
app.use(cors());

// إعداد المسارات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// إعداد المسارات للملفات التي نحتاجها (مثل users.json)
const usersFilePath = path.join(__dirname, 'users.json');

// إعداد `body-parser`
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// تسجيل المستخدمين الجدد
app.post('/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    // قراءة البيانات من users.json
    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ خطأ في قراءة ملف المستخدمين:', err.message);
            return res.status(500).json({ message: '❌ خطأ في الخادم.' });
        }

        // تحويل البيانات من JSON إلى كائن JavaScript
        let users = [];
        if (data) {
            users = JSON.parse(data);
        }

        // التحقق إذا كان البريد الإلكتروني موجوداً مسبقاً
        const userExists = users.find(user => user.email === email);
        if (userExists) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        // تشفير كلمة المرور
        const hashedPassword = bcrypt.hashSync(password, 10);

        // إضافة المستخدم الجديد
        const newUser = {
            username: name,
            email: email,
            password: hashedPassword,
            registeredAt: new Date().toISOString()
        };
        users.push(newUser);

        // كتابة البيانات الجديدة إلى users.json
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error('❌ خطأ في كتابة بيانات المستخدمين:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
            }

            res.status(201).json({ message: '✅ تم التسجيل بنجاح!' });
        });
    });
});

// تشغيل السيرفر على Vercel أو الخادم المحلي
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
