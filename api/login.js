const bcrypt = require('bcrypt');
const fs = require('fs');

async function createTestUser() {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);
        const users = [{ email: 'test@example.com', password: passwordHash }];
        
        fs.writeFile('./users.json', JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error('خطأ أثناء كتابة الملف:', err);
            } else {
                console.log('تم إنشاء مستخدم تجريبي بنجاح!');
            }
        });

    } catch (error) {
        console.error('حدث خطأ:', error);
    }
}

createTestUser();
