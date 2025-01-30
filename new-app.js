const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// السماح بالطلبات من أي مكان (Vercel)
app.use(cors());

// إعداد المسارات الثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'support')));
app.use(express.static(path.join(__dirname, 'public', 'audio')));

// ملف المستخدمين
const usersFile = path.join(__dirname, 'users.json');

// التأكد من وجود ملف users.json
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// إعداد إعدادات البريد الإلكتروني باستخدام تفاصيل حسابك
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hacenatek9@gmail.com', // البريد الإلكتروني
        pass: 'hmhi fvrk nghr gdxd'  // كلمة المرور
    }
});

// تسجيل المستخدمين الجدد
app.post('/api/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صحيح.' });
    }

    fs.readFile(usersFile, (err, data) => {
        if (err) {
            console.error('❌ خطأ في قراءة ملف المستخدمين:', err.message);
            return res.status(500).json({ message: '❌ خطأ في الخادم.' });
        }

        let users = JSON.parse(data);

        // التحقق مما إذا كان البريد الإلكتروني مسجلاً مسبقًا
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: '❌ خطأ أثناء تشفير كلمة المرور.' });
            }

            const newUser = { 
                name, 
                email, 
                password: hashedPassword, 
                registeredAt: new Date().toISOString() 
            };
            users.push(newUser);

            fs.writeFile(usersFile, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error('❌ خطأ أثناء حفظ المستخدم:', err.message);
                    return res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
                }

                // إرسال بريد إلكتروني للمستخدم
                const mailOptions = {
                    from: 'hacenatek9@gmail.com', // البريد الإلكتروني
                    to: email,  // البريد الإلكتروني للمستقبل
                    subject: 'تسجيل جديد',
                    text: `مرحباً ${name}!\nتم تسجيلك بنجاح في تطبيقنا.\n\nتفاصيل التسجيل:\nالبريد الإلكتروني: ${email}\nكلمة المرور: ${password}\n\nمبروك على انضمامك!`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('❌ خطأ في إرسال البريد الإلكتروني:', error);
                    } else {
                        console.log('✅ تم إرسال البريد الإلكتروني بنجاح: ' + info.response);
                    }
                });

                res.status(201).json({ message: '✅ تم التسجيل بنجاح!' });
            });
        });
    });
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
