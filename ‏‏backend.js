app.post('/api/subscribe', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: '⚠️ جميع الحقول مطلوبة!' });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: '⚠️ البريد الإلكتروني غير صحيح.' });
    }

    try {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

        // التحقق من وجود البريد الإلكتروني مسبقًا
        if (users.some(user => user.email === email)) {
            return res.status(400).json({ message: '⚠️ البريد الإلكتروني مسجل مسبقًا.' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        // إضافة المستخدم الجديد
        const newUser = { name, email, password: hashedPassword, registeredAt: new Date().toISOString() };
        users.push(newUser);

        // تحديث ملف المستخدمين
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // إرسال البريد الإلكتروني
        const mailOptions = {
            from: '"منصة الصوت إلى نص" <hacenatek9@gmail.com>',
            to: email,
            subject: '🎉 تم التسجيل بنجاح - منصة تحويل النص إلى صوت',
            html: `
                <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; font-family: 'Cairo', sans-serif; text-align: center;">
                    <h2 style="color: #007bff;">🎉 مرحبًا ${name}، تم تسجيلك بنجاح!</h2>
                    <a href="https://from-text-to-voice-6nye.vercel.app/login.html" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">🔑 تسجيل الدخول</a>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ خطأ في إرسال البريد:', error);
                return res.status(500).json({ message: '❌ حدث خطأ في إرسال البريد.' });
            } else {
                console.log('✅ تم إرسال البريد:', info.response);
            }
        });

        res.status(201).json({ message: '✅ تم التسجيل بنجاح وتم إرسال بريد التأكيد!' });

    } catch (error) {
        console.error('❌ خطأ في تسجيل المستخدم:', error);
        res.status(500).json({ message: '❌ حدث خطأ أثناء التسجيل.' });
    }
});
