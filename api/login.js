const express = require('express');
const fs = require('fs').promises; // استخدام fs.promises لقراءة الملفات بشكل غير متزامن
const bcrypt = require('bcrypt'); 
const bodyParser = require('body-parser');

const router = express.Router();
router.use(bodyParser.json());

// مسار ملف المستخدمين
const USERS_FILE = './users.json';

// دالة قراءة المستخدمين من ملف JSON
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('خطأ في قراءة ملف المستخدمين:', err);
        return [];
    }
}

// نقطة النهاية لتسجيل الدخول
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await readUsers();

        // البحث عن المستخدم بالبريد الإلكتروني
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ message: 'المستخدم غير موجود' });
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }

        return res.status(200).json({ message: 'تم تسجيل الدخول بنجاح' });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
    }
});

module.exports = router;
