import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'data', 'users.json'); // مسار ملف JSON
  const { method } = req;

  // إنشاء ملف JSON إذا لم يكن موجودًا
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true }); // إنشاء المجلد إذا لم يكن موجودًا
    fs.writeFileSync(filePath, JSON.stringify([])); // إنشاء ملف فارغ
  }

  if (method === 'POST') {
    const { name, email, password } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !email || !password) {
      return res.status(400).json({ message: '⚠️ الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة!' });
    }

    // قراءة البيانات الحالية
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const users = JSON.parse(fileData);

    // التحقق من وجود المستخدم
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: '⚠️ هذا البريد الإلكتروني مسجل بالفعل.' });
    }

    // إضافة المستخدم الجديد
    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);

    // حفظ البيانات الجديدة في ملف JSON
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    return res.status(201).json({ message: '✅ تم الاشتراك بنجاح!', user: newUser });
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).json({ message: `⚠️ الطريقة ${method} غير مسموحة!` });
}


