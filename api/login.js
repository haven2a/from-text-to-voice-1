const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFile = path.join(process.cwd(), 'users.json');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '⚠️ الميثود غير مدعومة' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: '⚠️ البريد وكلمة المرور مطلوبان!' });
        }

        let users = [];
        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        }

        const user = users.find(user => user.email === email);

        if (!user) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير مسجل.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '⚠️ كلمة المرور غير صحيحة.' });
        }

        res.status(200).json({ message: '✅ تسجيل الدخول ناجح!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        return res.status(500).json({ message: '❌ خطأ داخلي في الخادم، حاول مرة أخرى لاحقًا.' });
    }
};
