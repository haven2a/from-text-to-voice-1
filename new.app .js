const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process'); // لإدارة إنشاء الصوت

const app = express();

// ✅ تعريف المنفذ مرة واحدة فقط
const PORT = process.env.PORT || 3000;

// جعل مجلد "public" يحتوي على الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// التأكد من أن مجلد "support" متاح أيضًا كملفات ثابتة
app.use(express.static(path.join(__dirname, 'support')));

// التأكد من أن مجلد "audio" متاح كملفات ثابتة
app.use(express.static(path.join(__dirname, 'public', 'audio')));

// إعدادات الـ view engine لتوجيه التطبيق إلى مجلد الـ templates داخل public
app.set('views', path.join(__dirname, 'public', 'templates')); // المسار هنا يشير إلى مجلد templates داخل public
app.set('view engine', 'html');

// مسار قاعدة البيانات
const dbPath = path.join(__dirname, 'support_messages.db');

// التحقق من وجود قاعدة البيانات
if (!fs.existsSync(dbPath)) {
    console.log("⚠️ قاعدة البيانات غير موجودة. سيتم إنشاؤها...");

    // إنشاء قاعدة البيانات وإنشاء الجدول إذا لم يكن موجودًا
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء قاعدة البيانات:', err.message);
        } else {
            console.log('✅ تم إنشاء قاعدة البيانات بنجاح');

            // إنشاء جدول الرسائل
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    message TEXT NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // إنشاء جدول المستخدمين
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

// إعدادات middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// إعدادات nodemailer (استخدام المتغيرات البيئية للأمان)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // البريد الإلكتروني من المتغيرات البيئية
        pass: process.env.EMAIL_PASS, // كلمة المرور من المتغيرات البيئية
    }
});

// دالة لإرسال البريد الإلكتروني الترحيبي
const sendWelcomeEmail = (to, username) => {
    const subject = 'مرحبًا بك في تطبيقنا!';

    // الرسالة بتنسيق HTML مع الخصائص المطلوبة
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
        from: process.env.EMAIL_USER, // بريد المرسل من المتغيرات البيئية
        to, // بريد المستلم
        subject, // عنوان الرسالة
        html: htmlContent, // محتوى الرسالة بتنسيق HTML
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            return console.error('❌ خطأ أثناء إرسال البريد الإلكتروني:', err.message);
        }
        console.log('✅ تم إرسال البريد الإلكتروني بنجاح:', info.response);
    });
};

// نقطة للاشتراك (التسجيل) للمستخدمين الجدد
app.post('/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    // التحقق من وجود البيانات المدخلة
    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة!' });
    }

    // التحقق من وجود المستخدم بالفعل في قاعدة البيانات
    const db = new sqlite3.Database(dbPath);
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    stmt.get(email, (err, row) => {
        if (err) {
            console.error('❌ خطأ أثناء التحقق من وجود المستخدم:', err.message);
            return res.status(500).json({ message: '❌ حدث خطأ أثناء التحقق من المستخدم.' });
        }

        if (row) {
            return res.status(400).json({ message: '⚠️ هذا البريد الإلكتروني مسجل بالفعل.' });
        }

        // إذا لم يكن المستخدم موجودًا، نبدأ عملية الاشتراك
        const hashedPassword = bcrypt.hashSync(password, 10);  // تشفير كلمة المرور

        // إدخال البيانات في قاعدة البيانات
        const insertStmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        insertStmt.run(name, email, hashedPassword, function(err) {
            if (err) {
                console.error('❌ خطأ أثناء إدخال بيانات المستخدم في قاعدة البيانات:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء الاشتراك.' });
            }
            res.status(201).json({ message: '✅ تم الاشتراك بنجاح!' });

            // إرسال البريد الإلكتروني الترحيبي بعد الاشتراك
            sendWelcomeEmail(email, name);
        });
        insertStmt.finalize();
    });

    stmt.finalize();
    db.close();
});

// نقطة استقبال رسائل الدعم الفني
app.post('/support', (req, res) => {
    const { name, email, message } = req.body;

    console.log('البيانات المستلمة من العميل للدعم الفني:', { name, email, message });  // إضافة تتبع للبيانات المستلمة

    if (!name || !email || !message) {
        return res.status(400).json({ message: '⚠️ الاسم، البريد الإلكتروني، والرسالة مطلوبة!' });
    }

    // إدخال البيانات في قاعدة البيانات
    const db = new sqlite3.Database(dbPath);
    const stmt = db.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)");
    stmt.run(name, email, message, function(err) {
        if (err) {
            console.error('❌ خطأ أثناء إدخال البيانات في قاعدة البيانات:', err.message);
            return res.status(500).json({ message: '❌ حدث خطأ أثناء إرسال الرسالة.' });
        }
        res.status(201).json({ message: '✅ تم إرسال الرسالة بنجاح!' });

        // إرسال البريد الإلكتروني بعد إرسال الرسالة
        sendWelcomeEmail(email, name);
    });
    stmt.finalize();
    db.close();
});

// تشغيل الخادم على المنفذ المحدد
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT}`);
});
