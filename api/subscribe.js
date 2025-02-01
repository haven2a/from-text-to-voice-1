// pages/api/subscribe.js
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '⚠️ الميثود غير مدعومة' });
    }
    console.log('📩 بيانات التسجيل:', req.body);
    res.status(201).json({ message: '✅ تم التسجيل بنجاح!' });
};
