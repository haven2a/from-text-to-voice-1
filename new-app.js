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

// السماح بالطلبات من أي مكان (Vercel)
app.use(cors());

// إعداد المسارات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'support')));
app.use(express.static(path.join(__dirname, 'public', 'audio')));

// إعداد قاعدة البيانات
const dbPath = path.join(__dirname, 'support_messages.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في إنشاء قاعدة البيانات:', err.message);
    } else {
        console.log('✅ قاعدة البيانات جاهزة');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// تسجيل المستخدمين الجدد
app.post('/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error('❌ خطأ أثناء التحقق من المستخدم:', err.message);
            return res.status(500).json({ message: '❌ خطأ في الخادم.' });
        }
        if (row) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword], function(err) {
            if (err) {
                console.error('❌ خطأ أثناء التسجيل:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
            }
            res.status(201).json({ message: '✅ تم التسجيل بنجاح!' });
        });
    });
});

// تشغيل السيرفر على Replit
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT} أو على Replit`);
});
