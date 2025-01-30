const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const usersFilePath = path.join(__dirname, 'users.json');

// السماح بالطلبات من أي مكان (Vercel)
app.use(cors());

// إعداد JSON Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// التأكد من وجود ملف المستخدمين
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, '[]', 'utf8');
}

// تسجيل المستخدمين الجدد
app.post('/subscribe', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    fs.readFile(usersFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('❌ خطأ في قراءة ملف المستخدمين:', err.message);
            return res.status(500).json({ message: '❌ خطأ في الخادم. الرجاء المحاولة لاحقًا.' });
        }

        let users = data ? JSON.parse(data) : [];

        if (users.find(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = { username: name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error('❌ خطأ أثناء حفظ البيانات:', err.message);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل. الرجاء المحاولة لاحقًا.' });
            }

            res.status(201).json({ message: '✅ تم التسجيل بنجاح!' });
        });
    });
});

// تشغيل السيرفر على Vercel
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على http://localhost:${PORT} أو على Vercel`);
});
