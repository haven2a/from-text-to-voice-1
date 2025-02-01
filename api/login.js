const bcrypt = require('bcryptjs');

let users = [
    { email: "test@example.com", password: "$2a$10$..." } // كلمة مرور مشفرة
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '⚠️ الميثود غير مدعومة' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ البريد وكلمة المرور مطلوبان!' });
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
}
lo
