app.post('/api/login', async (req, res) => {
    console.log('🔐 محاولة تسجيل الدخول:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '⚠️ البريد وكلمة المرور مطلوبان!' });
    }

    try {
        let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(user => user.email === email);

        console.log('📧 محاولة تسجيل الدخول:', email);
        console.log('🔍 المستخدم الموجود:', user);
        console.log('🔑 كلمة المرور المدخلة:', password);
        console.log('🔄 كلمة المرور المشفرة في JSON:', user ? user.password : 'غير موجود');

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
        res.status(500).json({ message: '❌ حدث خطأ أثناء تسجيل الدخول.' });
    }
});
