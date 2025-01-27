const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// ✅ تعريف المنفذ مرة واحدة فقط
const PORT = process.env.PORT || 3000;

// جعل مجلد "public" يحتوي على الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// التأكد من أن مجلد "support" متاح أيضًا كملفات ثابتة
app.use(express.static(path.join(__dirname, 'support')));

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
            db.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    message TEXT NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('❌ خطأ في إنشاء الجدول:', err.message);
                } else {
                    console.log('✅ تم إنشاء الجدول بنجاح');
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

// إعدادات nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hacenatek9@gmail.com', // البريد الإلكتروني للمُرسل
        pass: 'hmhi fvrk nghr gdxd', // كلمة مرور البريد الإلكتروني
    }
});

// دالة لإرسال البريد الإلكتروني الترحيبي
const sendWelcomeEmail = (to, username) => {
    const subject = 'مرحبًا بك في تطبيقنا!';
    
    // الرسالة بتنسيق HTML مع الخصائص المطلوبة
    const htmlContent = `
        <div style="border: 10px solid #4CAF50; padding: 40px; font-family: 'Cairo', sans-serif; font-size: 28px; text-align: center; background-color: #f0f8ff;">
            <img src="https://example.com/your-logo.png" alt="شعار التطبيق" style="max-width: 200px; margin-bottom: 20px;">
            <h2 style="color: #0000ff;">مرحبًا ${username}!</h2>
            <p>شكرًا لتسجيلك في تطبيقنا. نتمنى لك تجربة رائعة!</p>
            <p>فريق الدعم.</p>
            <a href="https://tex-to-vioce.vercel.app/" style="color: #ff0000; text-decoration: none; font-size: 24px;">زيارة تطبيقنا</a>
        </div>
    `;

    const mailOptions = {
        from: 'hacenatek9@gmail.com', // بريد المرسل
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

// نقطة لتسجيل العميل الجديد
app.post('/subscribe', (req, res) => {
    const { username, email, password } = req.body;

    console.log('البيانات المستلمة للتسجيل:', { username, email, password });  // إضافة تتبع للبيانات المستلمة

    // التحقق من وجود كافة الحقول
    if (!username || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول (الاسم، البريد الإلكتروني، وكلمة المرور) مطلوبة!' });
    }

    // قراءة البيانات من users.json
    fs.readFile(path.join(__dirname, 'users.json'), 'utf-8', (err, data) => {
        if (err) {
            console.error('❌ خطأ في قراءة بيانات المستخدمين:', err.message);
            return res.status(500).json({ message: '❌ حدث خطأ في قراءة بيانات المستخدمين.' });
        }

        let users = [];
        if (data) {
            users = JSON.parse(data); // تحويل البيانات من JSON إلى كائن JavaScript
        }

        // التحقق مما إذا كان المستخدم موجودًا بالفعل
        const userExists = users.some(user => user.email === email);
        if (userExists) {
            return res.status(400).json({ message: '❌ هذا البريد الإلكتروني مسجل بالفعل!' });
        }

        // تشفير كلمة المرور باستخدام bcrypt
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('❌ خطأ في تشفير كلمة المرور:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء تشفير كلمة المرور.' });
            }

            // إضافة المستخدم الجديد إلى القائمة
            const newUser = {
                username,
                email,
                password: hashedPassword,
                registeredAt: new Date().toISOString()
            };
            users.push(newUser);

            // حفظ البيانات المحدثة في ملف users.json
            fs.writeFile(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error('❌ خطأ في حفظ بيانات المستخدم:', err.message);
                    return res.status(500).json({ message: '❌ حدث خطأ في حفظ بيانات المستخدم.' });
                }

                // إرسال البريد الإلكتروني الترحيبي
                sendWelcomeEmail(email, username);

                console.log('✅ تم تسجيل العميل بنجاح:', { username, email });

                res.status(201).json({ message: '✅ تم تسجيل العميل بنجاح!' });
            });
        });
    });
});

// نقطة لعرض الصفحة الرئيسية
app.get('/', (req, res) => {
    console.log('تم الوصول إلى الصفحة الرئيسية');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// نقطة إرسال رسائل الدعم الفني
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
