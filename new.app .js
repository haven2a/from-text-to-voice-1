const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد المسارات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'support')));
app.use(express.static(path.join(__dirname, 'public', 'audio')));

// إعدادات عرض القوالب
app.set('views', path.join(__dirname, 'public', 'templates'));
app.set('view engine', 'html');

// إعداد قاعدة البيانات
const dbPath = path.join(__dirname, 'support_messages.db');

if (!fs.existsSync(dbPath)) {
    console.log("⚠️ قاعدة البيانات غير موجودة. سيتم إنشاؤها...");
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء قاعدة البيانات:', err.message);
        } else {
            console.log('✅ تم إنشاء قاعدة البيانات بنجاح');
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    message TEXT NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ خطأ في إنشاء جدول المستخدمين:', err.message);
                } else {
                    console.log('✅ تم إنشاء جدول المستخدمين بنجاح');
                }
            });
        }
    });
} else {
    console.log('✅ قاعدة البيانات موجودة');
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// إعدادات البريد الإلكتروني باستخدام المتغيرات البيئية
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const sendWelcomeEmail = (to, username) => {
    const subject = 'مرحبًا بك في تطبيقنا!';
    const htmlContent = `
        <div style="border: 10px solid #4CAF50; padding: 40px; font-family: 'Cairo', sans-serif; font-size: 28px; text-align: center; background-color: #f0f8ff;">
            <img src="/public/images/logo.png" alt="شعار التطبيق" style="max-width: 200px; margin-bottom: 20px;">
            <h2 style="color: #0000ff;">مرحبًا ${username}!</h2>
            <p>شكرًا لتسجيلك في تطبيقنا. نتمنى لك تجربة رائعة!</p>
            <p>فريق الدعم.</p>
            <a href="https://tex-to-vioce.vercel.app/1index.html" style="color: #ff0000; text-decoration: none; font-size: 24px;">زيارة تطبيقنا</a>
        </div>
    `;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: htmlContent,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('❌ خطأ أثناء إرسال البريد الإلكتروني:', err.message);
        } else {
            console.log('✅ تم إرسال البريد الإلكتروني بنجاح:', info.response);
        }
    });
};

// تسجيل المستخدمين الجدد
app.post('/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة!' });
    }

    const db = new sqlite3.Database(dbPath);
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error('❌ خطأ أثناء التحقق من وجود المستخدم:', err.message);
            return res.status(500).json({ message: '❌ حدث خطأ أثناء التحقق من المستخدم.' });
        }

        if (row) {
            return res.status(400).json({ message: '⚠️ هذا البريد الإلكتروني مسجل بالفعل.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword], function(err) {
            if (err) {
                console.error('❌ خطأ أثناء إدخال بيانات المستخدم في قاعدة البيانات:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء الاشتراك.' });
            }
            res.status(201).json({ message: '✅ تم الاشتراك بنجاح!' });
            sendWelcomeEmail(email, name);
        });
    });
    db.close();
});

// استقبال رسائل الدعم الفني
app.post('/support', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: '⚠️ الاسم، البريد الإلكتروني، والرسالة مطلوبة!' });
    }

    const db = new sqlite3.Database(dbPath);
    db.run("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)", [name, email, message], function(err) {
        if (err) {
            console.error('❌ خطأ أثناء إدخال البيانات في قاعدة البيانات:', err.message);
            return res.status(500).json({ message: '❌ حدث خطأ أثناء إرسال الرسالة.' });
        }
        res.status(201).json({ message: '✅ تم إرسال الرسالة بنجاح!' });
    });
    db.close();
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
