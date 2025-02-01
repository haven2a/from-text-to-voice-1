const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt'); // استخدام bcrypt بدلاً من bcryptjs
const bodyParser = require('body-parser');

const router = express.Router();
router.use(bodyParser.json());

const USERS_FILE = './users.json';

function readUsers() {
    if (fs.existsSync(USERS_FILE)) {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
    return [];
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

router.post('/subscribe', async (req, res) => {
    const { name, email, password } = req.body;
    let users = readUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'المستخدم موجود بالفعل' });
    }

    // تشفير كلمة المرور
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword };
        users.push(newUser);
        writeUsers(users);

        res.status(201).json({ message: 'تم التسجيل بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ أثناء التسجيل' });
    }
});

module.exports = router;
