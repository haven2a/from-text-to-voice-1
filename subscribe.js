const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const usersFile = path.join(process.cwd(), 'users.json');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '⚠️ الميثود غير مدعومة' });
    }

    console.log('📩 بيانات التسجيل:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صالح!' });
    }

    try {
        let users = [];
        if (fs.existsSync(usersFile)) {
            users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        }

        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // إعداد البريد الإلكتروني
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'تم التسجيل بنجاح',
            text: `مرحبًا ${name}،\n\nتم تسجيلك بنجاح في النظام. يمكنك الآن تسجيل الدخول.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ خطأ في إرسال البريد:', error);
                return res.status(500).json({ message: '❌ حدث خطأ أثناء إرسال البريد الإلكتروني.' });
            } else {
                console.log('✅ تم إرسال البريد:', info.response);
            }
        });

        res.status(201).json({ message: '✅ تم التسجيل بنجاح وتم إرسال بريد التأكيد!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل المستخدم:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
    }
};
