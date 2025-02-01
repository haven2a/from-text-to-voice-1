const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt'); // استخدام bcrypt بدلاً من bcryptjs
const bodyParser = require('body-parser');

const router = express.Router();
router.use(bodyParser.json());

// تحميل بيانات المستخدمين من ملف users.json
const USERS_FILE = './users.json';

function readUsers() {
    if (fs.existsSync(USERS_FILE)) {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    return [];
}

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();

    // البحث عن المستخدم بالبريد الإلكتروني
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ message: 'المستخدم غير موجود' });
    }

    // التحقق من كلمة المرور
    bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'خطأ في التحقق من كلمة المرور' });
        }
        if (!result) {
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }
        res.status(200).json({ message: 'تم تسجيل الدخول بنجاح' });
    });
});

module.exports = router;
